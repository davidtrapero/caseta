import { coloresEmpleado } from "../_lib/colores";
import type { TurnoSerializable } from "../types";

export function LeyendaEmpleados({ turnos }: { turnos: TurnoSerializable[] }) {
  const mapa = new Map<string, string>();
  for (const t of turnos) mapa.set(t.empleadoId, t.empleadoNombre);
  if (mapa.size === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {Array.from(mapa.entries()).map(([id, nombre]) => {
        const c = coloresEmpleado(id);
        return (
          <span key={id} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border"
              style={{ backgroundColor: c.backgroundColor, borderColor: c.borderColor }}
            />
            <span className="text-muted-foreground">{nombre}</span>
          </span>
        );
      })}
    </div>
  );
}
