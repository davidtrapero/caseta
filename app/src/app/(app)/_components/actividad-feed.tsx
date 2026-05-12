import type { ActividadData } from "../_lib/dashboard";

const FECHA_RELATIVA = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });

function tiempoRelativo(isoFecha: string): string {
  const diff = (new Date(isoFecha).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "ahora";
  if (abs < 3600) return FECHA_RELATIVA.format(Math.round(diff / 60), "minutes");
  if (abs < 86400) return FECHA_RELATIVA.format(Math.round(diff / 3600), "hours");
  return FECHA_RELATIVA.format(Math.round(diff / 86400), "days");
}

export function ActividadFeed({ actividad }: { actividad: ActividadData[] }) {
  if (actividad.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--surface-glass-border)] bg-[var(--surface-glass)] p-6 text-center text-sm text-muted-foreground">
        Sin actividad.
      </div>
    );
  }

  return (
    <ul
      className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md divide-y divide-[var(--surface-glass-border)]"
      style={{ boxShadow: "var(--surface-glass-shadow)" }}
    >
      {actividad.map((a) => (
        <li key={a.id} className="flex items-baseline gap-3 px-4 py-2.5">
          <span className="flex-1 text-sm">
            <span className="font-medium">{a.entidad}</span>
            {" "}
            <span className="text-muted-foreground">{a.accion}</span>
            {a.usuarioNombre ? (
              <span className="text-muted-foreground"> · {a.usuarioNombre}</span>
            ) : null}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {tiempoRelativo(a.fecha)}
          </span>
        </li>
      ))}
    </ul>
  );
}
