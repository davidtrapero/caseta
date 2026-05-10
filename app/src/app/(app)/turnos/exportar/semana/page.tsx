import { requireRole } from "@/lib/authz";
import { loadSemanaTurnos, vacantesDeTurno, resumenVacantes } from "../../_lib/loader";
import { LayoutExport } from "../../_components/LayoutExport";
import { BotonesExport } from "../../_components/BotonesExport";
import { ResumenVacantesPie } from "../../_components/ResumenVacantes";
import {
  formatFechaCorta,
  horaDe,
  DIAS_SEMANA_CORTOS,
  semanaIsoToLunes,
} from "../../_lib/fechas";
import { Fragment } from "react";
import type { TurnoSerializable } from "../../types";

type SP = Promise<{ casetaId?: string; semana?: string }>;

export default async function ExportarSemanaPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  await requireRole(["admin", "gerente", "cajero"]);
  const sp = await searchParams;
  const lunesParam = sp.semana ? semanaIsoToLunes(sp.semana) : undefined;
  const semana = await loadSemanaTurnos({ lunes: lunesParam, casetaId: sp.casetaId });

  if (!semana) {
    return <div className="p-8">Faltan datos base.</div>;
  }

  const turnosPorDia = new Map<string, TurnoSerializable[]>();
  for (const t of semana.turnos) {
    const ymd = t.fechaInicio.slice(0, 10);
    const arr = turnosPorDia.get(ymd) ?? [];
    arr.push(t);
    turnosPorDia.set(ymd, arr);
  }

  const dias: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(semana.lunes + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    const ymd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    dias.push(ymd);
  }

  const nombreSlug = semana.casetaSeleccionada.nombre.replace(/\s+/g, "-").toLowerCase();

  return (
    <LayoutExport
      eyebrow={`Turnos · Semana · ${semana.edicion.nombre}`}
      title={semana.casetaSeleccionada.nombre}
      subtitle={`${formatFechaCorta(semana.lunes)} – ${formatFechaCorta(semana.domingo)}`}
      exportId="export-semana"
      toolbar={
        <BotonesExport
          targetId="export-semana"
          nombreArchivo={`turnos-${nombreSlug}-${semana.lunes}`}
        />
      }
      footer={
        <>
          <span>Generado {new Date().toLocaleDateString("es-ES")}</span>
          <span>Caseta de Feria · {semana.edicion.nombre}</span>
        </>
      }
    >
      <table className="export-table">
        <thead>
          <tr>
            <th style={{ width: 90 }}>Día</th>
            <th style={{ width: 110 }}>Horario</th>
            <th style={{ width: 90 }}>Plazas</th>
            <th>Asignados</th>
          </tr>
        </thead>
        <tbody>
          {dias.map((fecha) => {
            const turnos = turnosPorDia.get(fecha) ?? [];
            const diaCorto = DIAS_SEMANA_CORTOS[(new Date(fecha).getUTCDay() + 6) % 7];
            const etiquetaDia = `${diaCorto} ${formatFechaCorta(fecha)}`;

            if (turnos.length === 0) {
              return (
                <tr key={fecha} style={{ color: "#7a6750" }}>
                  <td>{etiquetaDia}</td>
                  <td colSpan={3}>
                    <em>Sin turnos programados</em>
                  </td>
                </tr>
              );
            }

            const filas: React.ReactNode[] = [];
            for (const t of turnos) {
              const totalPlazas = t.plazas.reduce((s, p) => s + p.cantidad, 0);
              filas.push(
                <tr key={t.id}>
                  <td>{etiquetaDia}</td>
                  <td className="export-mono">
                    {horaDe(t.fechaInicio)}–{horaDe(t.fechaFin)}
                  </td>
                  <td>
                    {t.asignaciones.length}/{totalPlazas}
                  </td>
                  <td>
                    {t.asignaciones.length === 0 ? (
                      <em style={{ color: "#7a6750" }}>Sin asignar</em>
                    ) : (
                      t.asignaciones.map((a) => (
                        <div key={a.empleadoId}>
                          {a.empleadoNombre}
                          {a.esVoluntario ? (
                            <span style={{ fontSize: 10, color: "#7a6750" }}>
                              {" "}
                              (voluntario)
                            </span>
                          ) : null}
                        </div>
                      ))
                    )}
                  </td>
                </tr>,
              );

              const vacantes = vacantesDeTurno(t);
              for (const v of vacantes) {
                const tipo = semana.tiposEmpleado.find((x) => x.id === v.tipoEmpleadoId);
                for (let i = 0; i < v.faltan; i++) {
                  filas.push(
                    <tr key={`${t.id}-vac-${v.tipoEmpleadoId}-${i}`} className="export-vacante">
                      <td>{etiquetaDia}</td>
                      <td className="export-mono">
                        {horaDe(t.fechaInicio)}–{horaDe(t.fechaFin)}
                      </td>
                      <td>—</td>
                      <td>VACANTE — {tipo?.label ?? "?"}</td>
                    </tr>,
                  );
                }
              }
            }
            return <Fragment key={fecha}>{filas}</Fragment>;
          })}
        </tbody>
      </table>

      <ResumenVacantesPie
        resumen={resumenVacantes(semana.turnos)}
        tipos={semana.tiposEmpleado}
      />
    </LayoutExport>
  );
}
