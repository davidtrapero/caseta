import { requireRole } from "@/lib/authz";
import { loadTurnosEmpleado } from "../../_lib/loader";
import { LayoutExport } from "../../_components/LayoutExport";
import { BotonesExport } from "../../_components/BotonesExport";
import {
  formatFechaLarga,
  formatFechaCorta,
  horaDe,
  duracionHoras,
} from "../../_lib/fechas";
import { colorFor } from "../../_lib/perfiles";

type SP = Promise<{ empleadoId?: string; desde?: string; hasta?: string }>;

export default async function ExportarEmpleadoPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  await requireRole(["admin", "gerente", "cajero"]);
  const sp = await searchParams;

  if (!sp.empleadoId) {
    return <div className="p-8">Falta el parámetro empleadoId.</div>;
  }

  const data = await loadTurnosEmpleado({
    empleadoId: sp.empleadoId,
    desde: sp.desde,
    hasta: sp.hasta,
  });

  if (!data) {
    return (
      <div className="p-8">Empleado no encontrado o faltan datos base.</div>
    );
  }

  const totalHoras = data.turnos.reduce(
    (acc, t) => acc + duracionHoras(t.fechaInicio, t.fechaFin),
    0,
  );
  const asistidos = data.turnos.filter((t) => t.asistio).length;
  const sufijoPlural = data.turnos.length === 1 ? "" : "s";

  const slugNombre = data.empleado.nombre
    .replace(/\s+/g, "-")
    .toLowerCase();
  const nombreArchivo = `turnos-${slugNombre}-${data.desde}-${data.hasta}`;

  const tipoLabel = data.empleado.tipoEmpleado?.label ?? "";
  const subtitle = `${tipoLabel}${data.empleado.esVoluntario ? " · Voluntario" : ""} — ${formatFechaCorta(data.desde)} a ${formatFechaCorta(data.hasta)}`;

  return (
    <LayoutExport
      eyebrow={`Turnos · Empleado · ${data.edicion.nombre}`}
      title={data.empleado.nombre}
      subtitle={subtitle}
      exportId="export-empleado"
      toolbar={
        <BotonesExport
          targetId="export-empleado"
          nombreArchivo={nombreArchivo}
        />
      }
      footer={
        <>
          <span>Generado {formatFechaLarga(new Date().toISOString().slice(0, 10))}</span>
          <span>{data.edicion.nombre}</span>
        </>
      }
    >
      {(() => {
        const tipo = data.empleado.tipoEmpleado;
        if (!tipo) return null;
        const colores = colorFor(tipo);
        return (
          <div style={{ marginBottom: 12 }}>
            <span
              data-tipo-slug={tipo.slug}
              style={{
                background: colores.bg,
                color: colores.text,
                borderLeft: `3px solid ${colores.border}`,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                display: "inline-block",
              }}
            >
              {tipo.label}
            </span>
          </div>
        );
      })()}

      {data.turnos.length === 0 ? (
        <p>Sin turnos asignados en este rango.</p>
      ) : (
        <table className="export-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Caseta</th>
              <th style={{ width: 120 }}>Horario</th>
              <th style={{ width: 90 }}>Asistencia</th>
            </tr>
          </thead>
          <tbody>
            {data.turnos.map((t) => (
              <tr key={t.id}>
                <td style={{ textTransform: "capitalize" }}>
                  {formatFechaLarga(t.fechaInicio.slice(0, 10))}
                </td>
                <td>{t.caseta.nombre}</td>
                <td style={{ fontFamily: "monospace" }}>
                  {horaDe(t.fechaInicio)}–{horaDe(t.fechaFin)}
                </td>
                <td
                  style={{
                    color: t.asistio ? "#5e7040" : "#5b4a36",
                    fontSize: 16,
                    textAlign: "center",
                  }}
                >
                  {t.asistio ? "■" : "□"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="export-resumen ok">
        <strong>Total:</strong> {data.turnos.length} turnos · {totalHoras}h ·{" "}
        {asistidos}/{data.turnos.length} asistencia{sufijoPlural}
      </div>
    </LayoutExport>
  );
}
