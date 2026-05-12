import Link from "next/link";
import type { AlertaData } from "../_lib/dashboard";

const ICONO: Record<AlertaData["tipo"], string> = {
  solicitud: "●",
  cierre_faltante: "▲",
  pedido_pendiente: "◆",
};

export function AlertasPanel({ alertas }: { alertas: AlertaData[] }) {
  if (alertas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--surface-glass-border)] bg-[var(--surface-glass)] p-6 text-center text-sm text-muted-foreground">
        Sin alertas pendientes.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {alertas.map((a) => (
        <li key={`${a.tipo}-${a.href}`}>
          <Link
            href={a.href}
            className="flex items-start gap-3 rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md px-4 py-3 hover:bg-[hsl(var(--primary)/0.08)] transition-colors group"
            style={{ boxShadow: "var(--surface-glass-shadow)" }}
          >
            <span className="mt-0.5 text-[10px] text-primary select-none">
              {ICONO[a.tipo]}
            </span>
            <span className="flex-1 text-sm leading-snug">{a.mensaje}</span>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors mt-0.5">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
