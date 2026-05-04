import { requireRole } from "@/lib/authz";
import { loadDiaTurnos } from "../_lib/loader";
import {
  formatFechaLarga,
  horaDe,
  duracionHoras,
} from "../_lib/fechas";
import { BotonImprimir } from "../_components/BotonImprimir";

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

  // Conjunto de empleados únicos presentes en el día (para columnas, opcional).
  // Formato elegido: una fila por turno con sus empleados listados y asistencia.
  return (
    <div className="min-h-screen bg-white text-black p-8 print:p-0">
      <style>{`
        @media print {
          @page { margin: 1.2cm; }
          body { background: white !important; }
          .no-print { display: none !important; }
        }
        .print-table { border-collapse: collapse; width: 100%; }
        .print-table th, .print-table td {
          border: 1px solid #333;
          padding: 6px 8px;
          text-align: left;
          vertical-align: top;
          font-size: 12px;
        }
        .print-table th { background: #ebe3d3; font-weight: 600; }
        .emp-line { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
        .check-box {
          display: inline-block;
          width: 12px; height: 12px;
          border: 1.2px solid #333;
        }
        .check-box.asistio { background: #333; }
      `}</style>

      <div className="no-print mb-4 flex items-center gap-2">
        <BotonImprimir />
      </div>

      <header className="mb-4">
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
          Caseta · {dia.edicion.nombre}
        </div>
        <h1 style={{ fontSize: 22, margin: "4px 0 0" }}>
          {dia.casetaSeleccionada.nombre}
        </h1>
        <div style={{ fontSize: 14, textTransform: "capitalize" }}>
          {formatFechaLarga(dia.fecha)}
        </div>
      </header>

      {dia.turnos.length === 0 ? (
        <p>No hay turnos programados este día.</p>
      ) : (
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Horario</th>
              <th style={{ width: 60 }}>Duración</th>
              <th>Empleados y asistencia</th>
            </tr>
          </thead>
          <tbody>
            {dia.turnos.map((t) => (
              <tr key={t.id}>
                <td style={{ fontFamily: "monospace" }}>
                  {horaDe(t.fechaInicio)}–{horaDe(t.fechaFin)}
                </td>
                <td>{duracionHoras(t.fechaInicio, t.fechaFin)}h</td>
                <td>
                  {t.asignaciones.length === 0 ? (
                    <em style={{ color: "#666" }}>Sin asignar</em>
                  ) : (
                    t.asignaciones.map((a) => (
                      <div className="emp-line" key={a.empleadoId}>
                        <span
                          className={`check-box ${a.asistio ? "asistio" : ""}`}
                        />
                        <span>{a.empleadoNombre}</span>
                        {a.esVoluntario ? (
                          <span style={{ fontSize: 10, color: "#666" }}>
                            (voluntario)
                          </span>
                        ) : null}
                      </div>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer style={{ marginTop: 24, fontSize: 10, color: "#666" }}>
        Firma responsable: __________________________
      </footer>
    </div>
  );
}

