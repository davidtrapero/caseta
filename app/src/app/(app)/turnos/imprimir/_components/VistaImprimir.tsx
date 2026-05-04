"use client";

import type { SemanaTurnos } from "../../types";
import { addDays, fromIsoDate, nombreDia, formatRangoSemana, toIsoDate } from "../../_lib/fechas";
import { coloresEmpleado } from "../../_lib/colores";

// Layout print-friendly. Se oculta sidebar y cromo vía CSS print.
// El usuario lanza Ctrl+P.

export function VistaImprimir({ semana }: { semana: SemanaTurnos }) {
  const lunes = fromIsoDate(semana.lunes);
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i));

  // Agrupar turnos por día (segmentamos cross-midnight en dos filas lógicas).
  const filasPorDia = new Map<string, Array<{
    id: string;
    nombre: string;
    inicio: string;
    fin: string;
    horas: number;
    color: ReturnType<typeof coloresEmpleado>;
    continua?: "entra" | "sale";
  }>>();

  for (const t of semana.turnos) {
    const ini = new Date(t.fechaInicio);
    const fin = new Date(t.fechaFin);
    const diaIni = toIsoDate(ini);
    const diaFin = toIsoDate(fin);
    const horasTotales = (fin.getTime() - ini.getTime()) / 3_600_000;
    const color = coloresEmpleado(t.empleadoId);
    const push = (k: string, row: { id: string; nombre: string; inicio: string; fin: string; horas: number; color: ReturnType<typeof coloresEmpleado>; continua?: "entra" | "sale" }) => {
      const arr = filasPorDia.get(k) ?? [];
      arr.push(row);
      filasPorDia.set(k, arr);
    };
    if (diaIni === diaFin) {
      push(diaIni, {
        id: t.id,
        nombre: t.empleadoNombre,
        inicio: fmt(ini),
        fin: fmt(fin),
        horas: horasTotales,
        color,
      });
    } else {
      push(diaIni, {
        id: t.id,
        nombre: t.empleadoNombre,
        inicio: fmt(ini),
        fin: "24h",
        horas: horasTotales,
        color,
        continua: "sale",
      });
      push(diaFin, {
        id: t.id,
        nombre: t.empleadoNombre,
        inicio: "00h",
        fin: fmt(fin),
        horas: horasTotales,
        color,
        continua: "entra",
      });
    }
  }

  return (
    <div className="print-root">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          aside, header, nav, .no-print { display: none !important; }
          body { background: white !important; color: #14100c !important; }
          .print-root { padding: 0 !important; }
        }
        .print-root { color: hsl(var(--foreground)); }
        .print-table { width: 100%; border-collapse: collapse; }
        .print-table th, .print-table td {
          border: 1px solid hsl(var(--border));
          padding: 6px 8px;
          vertical-align: top;
          font-size: 11px;
        }
        .print-table th {
          background: hsl(var(--muted));
          text-align: left;
          font-family: var(--font-display);
          font-weight: 600;
        }
        .print-row + .print-row { margin-top: 4px; }
      `}</style>

      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl">Turnos — {semana.casetaSeleccionada.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {formatRangoSemana(lunes, addDays(lunes, 6))} · Edición {semana.edicion.nombre}
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Impreso el {new Date().toLocaleDateString("es-ES")}
        </div>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: "14%" }}>Día</th>
            <th>Turnos</th>
          </tr>
        </thead>
        <tbody>
          {dias.map((d) => {
            const diaIso = toIsoDate(d);
            const filas = (filasPorDia.get(diaIso) ?? []).sort((a, b) => a.inicio.localeCompare(b.inicio));
            return (
              <tr key={diaIso}>
                <td>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                    {cap(nombreDia(d))}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {d.getDate().toString().padStart(2, "0")}/{(d.getMonth() + 1).toString().padStart(2, "0")}
                  </div>
                </td>
                <td>
                  {filas.length === 0 ? (
                    <span className="text-muted-foreground text-xs">— sin turnos —</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {filas.map((f, idx) => (
                        <div
                          key={f.id + idx}
                          className="print-row flex items-center gap-2"
                        >
                          <span
                            className="inline-block h-3 w-3 rounded-sm border shrink-0"
                            style={{
                              backgroundColor: f.color.backgroundColor,
                              borderColor: f.color.borderColor,
                            }}
                          />
                          <span className="font-mono text-xs w-20 shrink-0">
                            {f.inicio}–{f.fin}
                          </span>
                          <span className="flex-1">{f.nombre}</span>
                          <span className="font-mono text-xs text-muted-foreground shrink-0">
                            {f.horas}h{f.continua === "sale" ? " · sigue" : f.continua === "entra" ? " · viene" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground no-print">
        <span>Usa Ctrl+P para imprimir o exportar a PDF.</span>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm hover:bg-accent"
        >
          Imprimir
        </button>
      </div>
    </div>
  );
}

function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}h`;
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
