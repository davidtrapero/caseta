import { requireRole } from "@/lib/authz";
import { loadDiaTurnos, vacantesDeTurno, resumenVacantes } from "../../_lib/loader";
import { LayoutExport } from "../../_components/LayoutExport";
import { BotonesExport } from "../../_components/BotonesExport";
import { ResumenVacantesPie } from "../../_components/ResumenVacantes";
import { formatFechaLarga, horaDe, duracionHoras } from "../../_lib/fechas";
import { colorFor } from "../../_lib/perfiles";

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
          <span>Firma responsable: ____________________</span>
        </>
      }
    >
      {dia.turnos.length === 0 ? (
        <p>No hay turnos programados este día.</p>
      ) : (
        <table className="export-table">
          <thead>
            <tr>
              <th style={{ width: 130 }}>Horario</th>
              <th style={{ width: 80 }}>Duración</th>
              <th>Empleados</th>
            </tr>
          </thead>
          <tbody>
            {dia.turnos.flatMap((t) => {
              const filaTurno = (
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
                      t.asignaciones.map((a) => {
                        const tipo = dia.tiposEmpleado.find(
                          (te) => te.id === a.tipoEmpleadoId,
                        );
                        const colores = tipo
                          ? colorFor(tipo)
                          : { bg: "transparent", border: "#ccc", text: "inherit" };
                        return (
                          <div
                            key={a.empleadoId}
                            data-tipo-slug={tipo?.slug}
                            style={{
                              background: colores.bg,
                              color: colores.text,
                              borderLeft: `3px solid ${colores.border}`,
                              padding: "2px 6px",
                              margin: "1px 0",
                              display: "inline-block",
                              marginRight: 4,
                            }}
                          >
                            {a.empleadoNombre}
                            {a.esVoluntario ? " (voluntario)" : ""}
                          </div>
                        );
                      })
                    )}
                  </td>
                </tr>
              );
              const filasVacantes = vacantesDeTurno(t).flatMap((v) => {
                const tipo = dia.tiposEmpleado.find((x) => x.id === v.tipoEmpleadoId);
                const label = tipo?.label ?? "?";
                return Array.from({ length: v.faltan }).map((_, i) => (
                  <tr key={`${t.id}-vac-${v.tipoEmpleadoId}-${i}`} className="export-vacante">
                    <td></td>
                    <td></td>
                    <td>VACANTE — {label}</td>
                  </tr>
                ));
              });
              return [filaTurno, ...filasVacantes];
            })}
          </tbody>
        </table>
      )}

      <ResumenVacantesPie
        resumen={resumenVacantes(dia.turnos)}
        tipos={dia.tiposEmpleado}
      />
    </LayoutExport>
  );
}
