import { requireRole } from "@/lib/authz";
import { loadSemanaGlobal, resumenAlcance, vacantesDeTurno } from "../../_lib/loader";
import { LayoutExport } from "../../_components/LayoutExport";
import { BotonesExport } from "../../_components/BotonesExport";
import { BandaResumen } from "../../_components/BandaResumen";
import { FiltroCasetas } from "../../_components/FiltroCasetas";
import {
  formatFechaCorta,
  DIAS_SEMANA_CORTOS,
  horaDe,
  semanaIsoToLunes,
} from "../../_lib/fechas";
import { colorFor, nombreCorto } from "../../_lib/perfiles";
import type { TurnoSerializable, TipoEmpleadoLite } from "../../types";

function CeldaTurno({
  turno,
  tipos,
}: {
  turno: TurnoSerializable;
  tipos: TipoEmpleadoLite[];
}) {
  const conPlazas = turno.plazas.length > 0;
  const vacantes = vacantesDeTurno(turno);
  const completo = conPlazas && vacantes.length === 0;
  const dotClass = !conPlazas ? "none" : completo ? "ok" : "warn";

  // Conteo de asignados por tipo.
  const asigPorTipo = new Map<string, number>();
  for (const a of turno.asignaciones) {
    asigPorTipo.set(a.tipoEmpleadoId, (asigPorTipo.get(a.tipoEmpleadoId) ?? 0) + 1);
  }
  const tipoIds = new Set<string>([
    ...turno.plazas.map((p) => p.tipoEmpleadoId),
    ...asigPorTipo.keys(),
  ]);
  const tiposBadge = tipos.filter((te) => tipoIds.has(te.id));

  // Nombres: hasta 5 + "+N más", con tooltip listando todos.
  const nombresCompletos = turno.asignaciones.map((a) => a.empleadoNombre);
  const limite = 5;
  const visibles = nombresCompletos.slice(0, limite).map(nombreCorto);
  const restantes = nombresCompletos.length - limite;

  return (
    <div className="global-turno">
      <div className="global-turno-head">
        <span className={`global-turno-dot ${dotClass}`} aria-hidden />
        <span className="global-turno-hora">
          {horaDe(turno.fechaInicio)}–{horaDe(turno.fechaFin)}
        </span>
      </div>
      {tiposBadge.length > 0 ? (
        <div className="global-turno-badges">
          {tiposBadge.map((tipo) => {
            const plaza = turno.plazas.find((p) => p.tipoEmpleadoId === tipo.id);
            const cantidad = plaza?.cantidad ?? 0;
            const asignados = asigPorTipo.get(tipo.id) ?? 0;
            const sinCubrir = cantidad > 0 && asignados < cantidad;
            const colores = colorFor(tipo);
            return (
              <span
                key={tipo.id}
                className="global-turno-badge"
                style={{
                  background: colores.bg,
                  color: colores.text,
                  borderColor: colores.border,
                }}
                title={`${tipo.label}: ${asignados}${cantidad > 0 ? `/${cantidad}` : ""}`}
              >
                {tipo.labelCorto}
                <span className={sinCubrir ? "sin-cubrir" : undefined}>
                  {asignados}
                  {cantidad > 0 ? `/${cantidad}` : ""}
                </span>
              </span>
            );
          })}
        </div>
      ) : null}
      {nombresCompletos.length > 0 ? (
        <div
          className="global-turno-nombres"
          title={nombresCompletos.join(", ")}
        >
          {visibles.join(" · ")}
          {restantes > 0 ? ` · +${restantes} más` : ""}
        </div>
      ) : null}
    </div>
  );
}

type SP = Promise<{
  semana?: string;
  casetaIds?: string;
  casetaId?: string;
}>;

export default async function ExportarSemanaGlobalPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  await requireRole(["admin", "gerente", "cajero"]);
  const sp = await searchParams;
  const lunesParam = sp.semana ? semanaIsoToLunes(sp.semana) : undefined;
  const seleccionadasIds = sp.casetaIds
    ? sp.casetaIds.split(",").filter(Boolean)
    : sp.casetaId
      ? [sp.casetaId]
      : [];
  const data = await loadSemanaGlobal({
    lunes: lunesParam,
    casetaIds: seleccionadasIds,
  });

  if (!data) {
    return <div className="p-8">Faltan datos base.</div>;
  }

  const totalVac = data.filas.reduce(
    (s, f) => s + f.dias.reduce((s2, d) => s2 + d.totalVacantes, 0),
    0,
  );

  const fechasHeader = Array.from({ length: 7 }, (_, i) =>
    data.filas[0]?.dias[i]?.fecha ?? "",
  );

  const turnos = data.filas.flatMap((f) => f.dias.flatMap((d) => d.turnos));

  return (
    <LayoutExport
      eyebrow={`Turnos · Vista global semana · ${data.edicion.nombre}`}
      title="Cuadrante semanal"
      subtitle={`${formatFechaCorta(data.lunes)} – ${formatFechaCorta(data.domingo)}`}
      exportId="export-semana-global"
      toolbar={
        <>
          <BotonesExport
            targetId="export-semana-global"
            nombreArchivo={`turnos-semana-global-${data.lunes}`}
          />
          <FiltroCasetas
            casetas={data.casetas}
            seleccionadas={seleccionadasIds}
          />
        </>
      }
      footer={
        <>
          <span>Generado {formatFechaCorta(data.hoyIso)}</span>
          <span>{data.edicion.nombre}</span>
        </>
      }
    >
      <BandaResumen
        resumen={resumenAlcance(turnos)}
        tipos={data.tiposEmpleado}
        variante="papel"
      />
      <table className="export-table">
        <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <tr>
            <th>Caseta</th>
            {fechasHeader.map((fecha, i) => (
              <th key={i}>
                {DIAS_SEMANA_CORTOS[i]} {fecha ? formatFechaCorta(fecha) : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.filas.map((fila) => {
            const totalTurnosCaseta = fila.dias.reduce(
              (s, d) => s + d.numTurnos,
              0,
            );
            if (totalTurnosCaseta === 0 && seleccionadasIds.length === 0) {
              return (
                <tr key={fila.caseta.id} className="caseta-vacia">
                  <td colSpan={8}>
                    {fila.caseta.nombre} — sin turnos esta semana
                  </td>
                </tr>
              );
            }
            return (
              <tr key={fila.caseta.id}>
                <td>
                  <strong>{fila.caseta.nombre}</strong>
                </td>
                {fila.dias.map((celda) => {
                  if (celda.numTurnos === 0) {
                    return (
                      <td key={celda.fecha} className="global-td global-td-vacio">
                        —
                      </td>
                    );
                  }
                  const tieneVacantes = celda.totalVacantes > 0;
                  return (
                    <td
                      key={celda.fecha}
                      className={`global-td${tieneVacantes ? " export-vacante" : ""}`}
                    >
                      {celda.turnos.map((t) => (
                        <CeldaTurno key={t.id} turno={t} tipos={data.tiposEmpleado} />
                      ))}
                      {tieneVacantes ? (
                        <div className="global-resumen-vacantes">
                          {celda.totalVacantes} vacante
                          {celda.totalVacantes === 1 ? "" : "s"}
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={`export-resumen ${totalVac === 0 ? "ok" : ""}`}>
        <strong>
          {totalVac === 0
            ? "Sin huecos en ninguna caseta."
            : `${totalVac} plazas sin cubrir en la semana.`}
        </strong>
      </div>
    </LayoutExport>
  );
}
