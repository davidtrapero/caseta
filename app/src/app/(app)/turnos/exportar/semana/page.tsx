import { requireRole } from "@/lib/authz";
import { loadSemanaTurnos, vacantesDeTurno, resumenAlcance } from "../../_lib/loader";
import { LayoutExport } from "../../_components/LayoutExport";
import { BotonesExport } from "../../_components/BotonesExport";
import { BandaResumen } from "../../_components/BandaResumen";
import {
  formatFechaCorta,
  horaDe,
  duracionHoras,
  DIAS_SEMANA_CORTOS,
  semanaIsoToLunes,
} from "../../_lib/fechas";
import { Fragment } from "react";
import type { TurnoSerializable } from "../../types";
import { agruparPorRol, nombreCorto } from "../../_lib/perfiles";

type SP = Promise<{ casetaId?: string; semana?: string }>;

type GrupoRol = {
  key: "coordinadores" | "trabajadores" | "voluntarios" | "otros";
  singular: string;
  plural: string;
  slug?: string;
};

const GRUPOS_ROL: GrupoRol[] = [
  { key: "coordinadores", singular: "Coordinador", plural: "Coordinadores" },
  { key: "trabajadores", singular: "Trabajador", plural: "Trabajadores" },
  { key: "voluntarios", singular: "Voluntario", plural: "Voluntarios", slug: "grupo-rol-vol" },
  { key: "otros", singular: "Otro", plural: "Otros" },
];

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
      <BandaResumen
        resumen={resumenAlcance(semana.turnos)}
        tipos={semana.tiposEmpleado}
        variante="papel"
      />

      <table className="export-table">
        <thead>
          <tr>
            <th style={{ width: 110 }}>Horario</th>
            <th style={{ width: 80 }}>Duración</th>
            <th>Asignados</th>
            <th style={{ width: 200 }}>Vacantes</th>
          </tr>
        </thead>
        <tbody>
          {dias.map((fecha) => {
            const turnos = turnosPorDia.get(fecha) ?? [];
            const diaCorto = DIAS_SEMANA_CORTOS[(new Date(fecha).getUTCDay() + 6) % 7];
            const etiquetaDia = `${diaCorto} ${formatFechaCorta(fecha)}`;

            if (turnos.length === 0) {
              return (
                <tr key={fecha} className="dia-sin-turnos">
                  <td colSpan={4}>{etiquetaDia} — Sin turnos programados</td>
                </tr>
              );
            }

            const totalVacantesDia = turnos.reduce(
              (s, t) => s + vacantesDeTurno(t).reduce((ss, v) => ss + v.faltan, 0),
              0,
            );

            return (
              <Fragment key={fecha}>
                <tr className="dia-header">
                  <td colSpan={4}>
                    <div className="dia-header-row">
                      <span>{etiquetaDia}</span>
                      <span className="dia-header-resumen">
                        {turnos.length} turnos · {totalVacantesDia} vacantes
                      </span>
                    </div>
                  </td>
                </tr>
                {turnos.map((t) => {
                  const grupos = agruparPorRol(t.asignaciones, semana.tiposEmpleado);
                  const vacantes = vacantesDeTurno(t);
                  const totalVacTurno = vacantes.reduce((s, v) => s + v.faltan, 0);
                  const detalleVacantes = vacantes
                    .map((v) => {
                      const tipo = semana.tiposEmpleado.find((x) => x.id === v.tipoEmpleadoId);
                      if (!tipo) return null;
                      const label = v.faltan === 1 ? tipo.label : `${tipo.label}s`;
                      return `${v.faltan} ${label}`;
                    })
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <tr key={t.id}>
                      <td className="export-mono">
                        {horaDe(t.fechaInicio)}–{horaDe(t.fechaFin)}
                      </td>
                      <td className="export-mono">
                        {duracionHoras(t.fechaInicio, t.fechaFin)}h
                      </td>
                      <td>
                        {t.asignaciones.length === 0 ? (
                          <em>Sin asignar</em>
                        ) : (
                          GRUPOS_ROL.map((g) => {
                            const items = grupos[g.key];
                            if (items.length === 0) return null;
                            const count = items.length;
                            const etiqueta = count === 1 ? g.singular : g.plural;
                            const className = `grupo-rol${g.slug ? ` ${g.slug}` : ""}`;
                            return (
                              <div key={g.key} className={className}>
                                <span className="grupo-rol-titulo">
                                  {etiqueta} ({count})
                                </span>{" "}
                                <span className="grupo-rol-nombres">
                                  {items.map((a) => nombreCorto(a.empleadoNombre)).join(" · ")}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </td>
                      <td>
                        {totalVacTurno > 0 ? (
                          <span className="vacantes-inline">{detalleVacantes}</span>
                        ) : t.plazas.length > 0 ? (
                          <span className="vacantes-inline cubierto">Completo</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </LayoutExport>
  );
}
