import { requireRole } from "@/lib/authz";
import { loadDiaTurnos, resumenAlcance, vacantesDeTurno } from "../_lib/loader";
import {
  formatFechaLarga,
  horaDe,
} from "../_lib/fechas";
import {
  agruparPorRol,
  agruparPorTipo,
  agruparVoluntariosPorEntidad,
  nombreCorto,
} from "../_lib/perfiles";
import { BotonImprimir } from "../_components/BotonImprimir";
import type { AsignacionSerializable, TipoEmpleadoLite } from "../types";

type SP = Promise<{ fecha?: string; casetaId?: string }>;

export default async function ImprimirPage({
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

  const resumen = resumenAlcance(dia.turnos);
  const cobertura =
    resumen.plazasTotales === 0
      ? 0
      : Math.round((resumen.plazasCubiertas / resumen.plazasTotales) * 100);

  return (
    <div className="min-h-screen bg-white text-black p-8 print:p-0">
      <style>{ESTILO_IMPRIMIR}</style>

      <div className="no-print mb-4 flex items-center gap-2">
        <BotonImprimir />
        <a
          href={`/turnos/exportar/dia?fecha=${dia.fecha}&casetaId=${dia.casetaSeleccionada.id}`}
          target="_blank"
          rel="noreferrer"
          className="border border-black px-3 py-1 text-sm"
        >
          Vista exportable (sin checkboxes)
        </a>
      </div>

      <header className="imprimir-header">
        <div className="imprimir-eyebrow">
          Hoja de asistencia · {dia.edicion.nombre}
        </div>
        <h1 className="imprimir-title">{dia.casetaSeleccionada.nombre}</h1>
        <div className="imprimir-subtitle">{formatFechaLarga(dia.fecha)}</div>
      </header>

      <div className="imprimir-banda">
        <div className="imprimir-banda-row">
          <Kpi label="Turnos" value={resumen.numTurnos} />
          <Kpi label="Personas" value={resumen.numPersonas} />
          <Kpi
            label="Vacantes"
            value={resumen.vacantes.totalFaltan}
            tono={resumen.vacantes.totalFaltan > 0 ? "alerta" : "ok"}
          />
          <Kpi
            label="Cobertura"
            value={`${cobertura}%`}
            tono={cobertura === 100 ? "ok" : cobertura >= 70 ? undefined : "alerta"}
          />
        </div>
      </div>

      {dia.turnos.length === 0 ? (
        <p>No hay turnos programados este día.</p>
      ) : (
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Horario</th>
              <th>Empleados y asistencia</th>
              <th style={{ width: 160 }}>Vacantes</th>
            </tr>
          </thead>
          <tbody>
            {dia.turnos.map((t) => {
              const franja = t.franja;
              const grupos = agruparPorRol(t.asignaciones, dia.tiposEmpleado);
              const vacantes = vacantesDeTurno(t);
              const detalleVacantes = vacantes
                .map((v) => {
                  const tipo = dia.tiposEmpleado.find((te) => te.id === v.tipoEmpleadoId);
                  if (!tipo) return null;
                  const label = v.faltan === 1 ? tipo.label : `${tipo.label}s`;
                  return `${v.faltan} ${label}`;
                })
                .filter(Boolean)
                .join(" · ");

              return (
                <tr key={t.id}>
                  <td className={`mono franja-cell franja-${franja}`}>
                    {horaDe(t.fechaInicio)}–{horaDe(t.fechaFin)}
                  </td>
                  <td>
                    {t.asignaciones.length === 0 ? (
                      <em className="muted">Sin asignar</em>
                    ) : (
                      <div className="grupos-rol">
                        {grupos.coordinadores.length > 0 ? (
                          <BloqueRol
                            titulo={
                              grupos.coordinadores.length === 1
                                ? "Coordinador"
                                : "Coordinadores"
                            }
                            asignaciones={grupos.coordinadores}
                            tipos={dia.tiposEmpleado}
                            tono="rol"
                          />
                        ) : null}
                        {grupos.trabajadores.length > 0 ? (
                          <BloqueRol
                            titulo={
                              grupos.trabajadores.length === 1
                                ? "Personal contratado"
                                : "Personal contratado"
                            }
                            asignaciones={grupos.trabajadores}
                            tipos={dia.tiposEmpleado}
                            tono="rol"
                          />
                        ) : null}
                        {grupos.voluntarios.length > 0 ? (
                          <BloquePersonasVoluntarias
                            asignaciones={grupos.voluntarios}
                            tipos={dia.tiposEmpleado}
                          />
                        ) : null}
                        {grupos.otros.length > 0 ? (
                          <BloqueOtros
                            asignaciones={grupos.otros}
                            tipos={dia.tiposEmpleado}
                          />
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td>
                    {detalleVacantes ? (
                      <span className="vacantes-pill">{detalleVacantes}</span>
                    ) : t.plazas.length > 0 ? (
                      <span className="vacantes-pill cubierto">Completo</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <footer className="imprimir-footer">
        <span className="leyenda">
          <span className="leyenda-chip manana">Mañana</span>
          <span className="leyenda-chip tarde">Tarde</span>
          <span className="leyenda-chip noche">Noche</span>
        </span>
        <span>Firma responsable: __________________________</span>
      </footer>
    </div>
  );
}

function Kpi({
  label,
  value,
  tono,
}: {
  label: string;
  value: number | string;
  tono?: "ok" | "alerta";
}) {
  return (
    <div className={`imprimir-kpi ${tono ?? ""}`}>
      <span className="imprimir-kpi-label">{label}</span>
      <span className="imprimir-kpi-value">{value}</span>
    </div>
  );
}

function CheckLinea({
  asistio,
  nombre,
  sufijo,
  colorHex,
}: {
  asistio: boolean;
  nombre: string;
  sufijo?: string;
  colorHex: string;
}) {
  return (
    <div className="emp-line" style={{ borderLeftColor: colorHex }}>
      <span className={`check-box ${asistio ? "asistio" : ""}`} />
      <span className="emp-nombre">{nombre}</span>
      {sufijo ? <span className="emp-sufijo">{sufijo}</span> : null}
    </div>
  );
}

function BloqueRol({
  titulo,
  asignaciones,
  tipos,
  tono,
}: {
  titulo: string;
  asignaciones: AsignacionSerializable[];
  tipos: TipoEmpleadoLite[];
  tono: "rol" | "vol";
}) {
  return (
    <div className={`bloque-rol ${tono === "vol" ? "bloque-vol" : ""}`}>
      <div className="bloque-rol-titulo">
        {titulo} <span className="bloque-rol-count">({asignaciones.length})</span>
      </div>
      {asignaciones.map((a) => {
        const tipo = tipos.find((te) => te.id === a.tipoImputadoId);
        return (
          <CheckLinea
            key={a.empleadoId}
            asistio={a.asistio}
            nombre={a.empleadoNombre}
            colorHex={tipo?.colorHex ?? "#999"}
          />
        );
      })}
    </div>
  );
}

function BloquePersonasVoluntarias({
  asignaciones,
  tipos,
}: {
  asignaciones: AsignacionSerializable[];
  tipos: TipoEmpleadoLite[];
}) {
  const porEntidad = agruparVoluntariosPorEntidad(asignaciones);
  return (
    <div className="bloque-rol bloque-vol">
      <div className="bloque-rol-titulo">
        {asignaciones.length === 1 ? "Persona voluntaria" : "Personas voluntarias"}{" "}
        <span className="bloque-rol-count">({asignaciones.length})</span>
      </div>
      {porEntidad.map((g) => (
        <div key={g.entidadNombre} className="sub-grupo">
          <div className={`sub-grupo-titulo ${g.sinEntidad ? "sin-entidad" : ""}`}>
            {g.entidadNombre}
          </div>
          {g.asignaciones.map((a) => {
            const tipo = tipos.find((te) => te.id === a.tipoImputadoId);
            return (
              <CheckLinea
                key={a.empleadoId}
                asistio={a.asistio}
                nombre={a.empleadoNombre}
                colorHex={tipo?.colorHex ?? "#999"}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function BloqueOtros({
  asignaciones,
  tipos,
}: {
  asignaciones: AsignacionSerializable[];
  tipos: TipoEmpleadoLite[];
}) {
  const porTipo = agruparPorTipo(asignaciones, tipos);
  return (
    <div className="bloque-rol bloque-otros">
      {porTipo.map((g) => {
        const titulo =
          g.asignaciones.length === 1 ? g.tipo.label : `${g.tipo.label}s`;
        return (
          <div key={g.tipo.id} className="sub-grupo">
            <div className="sub-grupo-titulo">
              {titulo}{" "}
              <span className="bloque-rol-count">({g.asignaciones.length})</span>
            </div>
            {g.asignaciones.map((a) => (
              <CheckLinea
                key={a.empleadoId}
                asistio={a.asistio}
                nombre={a.empleadoNombre}
                colorHex={g.tipo.colorHex}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Mantener `nombreCorto` disponible aunque no se use directamente (sirve para
// derivados futuros si se exige una versión muy compacta de la hoja).
void nombreCorto;

const ESTILO_IMPRIMIR = `
  @media print {
    @page { margin: 1.2cm; }
    body { background: white !important; }
    .no-print { display: none !important; }
    tr { page-break-inside: avoid; }
  }

  .imprimir-header {
    margin-bottom: 12px;
  }
  .imprimir-eyebrow {
    font-size: 10px; text-transform: uppercase; letter-spacing: 1.4px;
    color: #5e7040;
  }
  .imprimir-title {
    font-family: var(--font-bricolage), serif;
    font-size: 24px; margin: 4px 0 0; letter-spacing: -0.01em;
  }
  .imprimir-subtitle {
    font-size: 13px; color: #5b4a36; text-transform: capitalize; margin-top: 2px;
  }

  .imprimir-banda {
    margin: 10px 0 14px;
    padding: 10px 14px;
    background: #f0e8d4;
    border: 1px solid #c6a878;
    border-radius: 4px;
  }
  .imprimir-banda-row { display: flex; gap: 28px; flex-wrap: wrap; }
  .imprimir-kpi { display: flex; flex-direction: column; line-height: 1.1; }
  .imprimir-kpi.alerta .imprimir-kpi-value { color: #5c1a17; }
  .imprimir-kpi.ok .imprimir-kpi-value { color: #5e7040; }
  .imprimir-kpi-label {
    font-size: 9.5px; text-transform: uppercase; letter-spacing: 1.1px; color: #5b4a36;
  }
  .imprimir-kpi-value {
    font-family: var(--font-bricolage), serif;
    font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums;
  }

  .print-table {
    border-collapse: collapse; width: 100%;
    print-color-adjust: exact; -webkit-print-color-adjust: exact;
  }
  .print-table th, .print-table td {
    border: 1px solid #b89968;
    padding: 6px 8px; text-align: left; vertical-align: top; font-size: 12px;
  }
  .print-table th {
    background: #ebe3d3; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.6px; font-size: 10.5px;
  }
  .mono { font-family: var(--font-mono), "JetBrains Mono", monospace; }
  .muted { color: #7a6750; font-style: italic; }

  /* Franja horaria izquierda en la celda Horario. */
  .franja-cell { position: relative; padding-left: 14px !important; }
  .franja-cell::before {
    content: ""; position: absolute; left: 0; top: 0; bottom: 0;
    width: 4px; background: #b8a78a;
    print-color-adjust: exact; -webkit-print-color-adjust: exact;
  }
  .franja-cell.franja-manana::before { background: #c68a3a; }
  .franja-cell.franja-tarde::before { background: #5e7040; }
  .franja-cell.franja-noche::before { background: #5c1a17; }

  /* Bloques agrupados por rol dentro de la celda Empleados. */
  .grupos-rol { display: flex; flex-direction: column; gap: 6px; }
  .bloque-rol { padding: 0; }
  .bloque-rol-titulo {
    font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.6px;
    color: #5b4a36; font-weight: 600; margin-bottom: 2px;
  }
  .bloque-rol.bloque-vol .bloque-rol-titulo { color: #5e7040; }
  .bloque-rol-count { color: #7a6750; font-weight: 500; }

  .sub-grupo { margin-top: 4px; }
  .sub-grupo + .sub-grupo { border-top: 1px dashed #c6a878; padding-top: 4px; }
  .sub-grupo-titulo {
    font-size: 10.5px; font-weight: 600; color: #1a1410;
    margin-bottom: 1px;
  }
  .sub-grupo-titulo.sin-entidad { color: #7a6750; font-style: italic; font-weight: 500; }

  /* Línea de empleado con checkbox + nombre. */
  .emp-line {
    display: flex; align-items: center; gap: 6px; padding: 2px 0 2px 6px;
    border-left: 4px solid #999;
    print-color-adjust: exact; -webkit-print-color-adjust: exact;
  }
  .check-box {
    display: inline-block; width: 12px; height: 12px;
    border: 1.2px solid #333; flex-shrink: 0;
    print-color-adjust: exact; -webkit-print-color-adjust: exact;
  }
  .check-box.asistio { background: #333; }
  .emp-nombre { font-size: 11.5px; }
  .emp-sufijo { font-size: 9.5px; color: #7a6750; }

  /* Vacantes inline. */
  .vacantes-pill {
    display: inline-block; padding: 2px 6px; border-radius: 2px;
    background: #f3dada; color: #5c1a17; border-left: 3px solid #5c1a17;
    font-size: 10.5px; font-weight: 600;
  }
  .vacantes-pill.cubierto {
    background: transparent; color: #5e7040;
    border-left-color: #5e7040; font-weight: 500;
  }

  /* Footer con leyenda + firma. */
  .imprimir-footer {
    margin-top: 18px; display: flex; justify-content: space-between; align-items: center;
    font-size: 10px; color: #7a6750;
  }
  .leyenda { display: inline-flex; gap: 12px; align-items: center; }
  .leyenda-chip { display: inline-flex; align-items: center; gap: 4px; }
  .leyenda-chip::before {
    content: ""; display: inline-block; width: 10px; height: 10px; border-radius: 2px;
    print-color-adjust: exact; -webkit-print-color-adjust: exact;
  }
  .leyenda-chip.manana::before { background: #c68a3a; }
  .leyenda-chip.tarde::before { background: #5e7040; }
  .leyenda-chip.noche::before { background: #5c1a17; }
`;
