import type { SemanaTurnos } from "../types";

export function BannerReadonly({ semana }: { semana: SemanaTurnos }) {
  if (!semana.readonly) return null;
  const motivos: string[] = [];
  if (!semana.edicion.activa) motivos.push(`edición ${semana.edicion.nombre} no activa`);
  if (!semana.casetaSeleccionada.activa) motivos.push(`caseta "${semana.casetaSeleccionada.nombre}" inactiva`);
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-foreground mb-4">
      <span className="font-medium">Solo lectura.</span>{" "}
      No se pueden crear ni editar turnos ({motivos.join(" · ")}).
    </div>
  );
}
