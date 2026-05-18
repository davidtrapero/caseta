import { requireRole } from "@/lib/authz";
import {
  loadDiaTurnos,
  vacantesDeTurno,
  resumenAlcance,
} from "../../_lib/loader";
import { LayoutExport } from "../../_components/LayoutExport";
import { BotonesExport } from "../../_components/BotonesExport";
import { BandaResumen } from "../../_components/BandaResumen";
import {
  formatFechaLarga,
  horaDe,
} from "../../_lib/fechas";
import { agruparPorRol, nombreCorto } from "../../_lib/perfiles";

type SP = Promise<{ fecha?: string; casetaId?: string }>;

export default async function ExportarDiaPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  await requireRole(["admin", "gerente", "cajero"]);
  const sp = await searchParams;
  const dia = await loadDiaTurnos({ fecha: sp.fecha, casetaId: sp.casetaId });

  if (!dia) {
    return <div className="p-8">Faltan datos base.</div>;
  }

  const slug = dia.casetaSeleccionada.nombre.replace(/\s+/g, "-").toLowerCase();
  const nombreArchivo = `turnos-${slug}-${dia.fecha}`;

  return (
    <LayoutExport
      eyebrow={`Turnos · Día · ${dia.edicion.nombre}`}
      title={dia.casetaSeleccionada.nombre}
      subtitle={formatFechaLarga(dia.fecha)}
      exportId="export-dia"
      toolbar={<BotonesExport targetId="export-dia" nombreArchivo={nombreArchivo} />}
      footer={
        <>
          <span>Generado {new Date().toLocaleDateString("es-ES")}</span>
          <span className="leyenda-franjas">
            <span className="leyenda-franja-chip manana">Mañana</span>
            <span className="leyenda-franja-chip tarde">Tarde</span>
            <span className="leyenda-franja-chip noche">Noche</span>
          </span>
          <span>Firma responsable: ____________________</span>
        </>
      }
    >
      <BandaResumen
        resumen={resumenAlcance(dia.turnos)}
        tipos={dia.tiposEmpleado}
        variante="papel"
      />

      {dia.turnos.length === 0 ? (
        <p>No hay turnos programados este día.</p>
      ) : (
        <table className="export-table">
          <thead>
            <tr>
              <th style={{ width: 130 }}>Horario</th>
              <th>Personal</th>
              <th style={{ width: 200 }}>Vacantes</th>
            </tr>
          </thead>
          <tbody>
            {dia.turnos.map((t) => {
              const franja = t.franja;
              const grupos = agruparPorRol(t.asignaciones, dia.tiposEmpleado);

              const bloquesGrupo: Array<{
                key: string;
                etiqueta: string;
                count: number;
                nombres: string[];
                esVoluntario: boolean;
              }> = [];
              if (grupos.coordinadores.length > 0) {
                bloquesGrupo.push({
                  key: "coord",
                  etiqueta:
                    grupos.coordinadores.length === 1
                      ? "Coordinador"
                      : "Coordinadores",
                  count: grupos.coordinadores.length,
                  nombres: grupos.coordinadores.map((a) => a.empleadoNombre),
                  esVoluntario: false,
                });
              }
              if (grupos.trabajadores.length > 0) {
                bloquesGrupo.push({
                  key: "trab",
                  etiqueta:
                    grupos.trabajadores.length === 1
                      ? "Personal contratado"
                      : "Personal contratado",
                  count: grupos.trabajadores.length,
                  nombres: grupos.trabajadores.map((a) => a.empleadoNombre),
                  esVoluntario: false,
                });
              }
              if (grupos.voluntarios.length > 0) {
                bloquesGrupo.push({
                  key: "vol",
                  etiqueta:
                    grupos.voluntarios.length === 1
                      ? "Persona voluntaria"
                      : "Personas voluntarias",
                  count: grupos.voluntarios.length,
                  nombres: grupos.voluntarios.map((a) => a.empleadoNombre),
                  esVoluntario: true,
                });
              }
              if (grupos.otros.length > 0) {
                bloquesGrupo.push({
                  key: "otros",
                  etiqueta: grupos.otros.length === 1 ? "Otro" : "Otros",
                  count: grupos.otros.length,
                  nombres: grupos.otros.map((a) => a.empleadoNombre),
                  esVoluntario: false,
                });
              }

              const vacantes = vacantesDeTurno(t);
              const totalVacantes = vacantes.reduce(
                (s, v) => s + v.faltan,
                0,
              );
              const detalleVacantes = vacantes
                .map((v) => {
                  const tipo = dia.tiposEmpleado.find(
                    (x) => x.id === v.tipoEmpleadoId,
                  );
                  const label = tipo?.label ?? "?";
                  const etiqueta =
                    v.faltan === 1 ? label : `${label}${label.endsWith("s") ? "" : "s"}`;
                  return `${v.faltan} ${etiqueta}`;
                })
                .join(" · ");

              return (
                <tr key={t.id}>
                  <td className={`export-mono franja-cell franja-${franja}`}>
                    {horaDe(t.fechaInicio)}–{horaDe(t.fechaFin)}
                  </td>
                  <td>
                    {t.asignaciones.length === 0 ? (
                      <em>Sin asignar</em>
                    ) : (
                      bloquesGrupo.map((g) => (
                        <div
                          key={g.key}
                          className={`grupo-rol ${g.esVoluntario ? "grupo-rol-vol" : ""}`}
                        >
                          <span className="grupo-rol-titulo">
                            {g.etiqueta} ({g.count})
                          </span>{" "}
                          <span className="grupo-rol-nombres">
                            {g.nombres.map(nombreCorto).join(" · ")}
                          </span>
                        </div>
                      ))
                    )}
                  </td>
                  <td>
                    {totalVacantes > 0 ? (
                      <span className="vacantes-inline">{detalleVacantes}</span>
                    ) : t.plazas.length > 0 ? (
                      <span className="vacantes-inline cubierto">Completo</span>
                    ) : (
                      <span style={{ color: "#7a6750" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </LayoutExport>
  );
}
