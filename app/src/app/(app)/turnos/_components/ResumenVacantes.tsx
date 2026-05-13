import type { ResumenVacantes, TipoEmpleadoLite } from "../types";

export function ResumenVacantesPie({
  resumen,
  tipos,
}: {
  resumen: ResumenVacantes;
  tipos: TipoEmpleadoLite[];
}) {
  if (resumen.totalFaltan === 0) {
    return (
      <div className="export-resumen ok">
        <strong>Sin huecos.</strong> Todas las plazas del rango están cubiertas.
      </div>
    );
  }
  const detalle = resumen.porTipo
    .map((p) => {
      const t = tipos.find((x) => x.id === p.tipoEmpleadoId);
      return `${t?.label ?? "?"} (${p.faltan})`;
    })
    .join(", ");
  return (
    <div className="export-resumen">
      <strong>{resumen.totalFaltan} plaza{resumen.totalFaltan === 1 ? "" : "s"} sin cubrir:</strong>{" "}
      {detalle}
    </div>
  );
}
