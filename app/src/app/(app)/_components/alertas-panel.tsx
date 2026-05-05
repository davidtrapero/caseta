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
      <div className="rounded-lg border border-dashed bg-card/40 p-6 text-center text-sm text-muted-foreground">
        Todo en orden — sin alertas pendientes.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {alertas.map((a) => (
        <li key={`${a.tipo}-${a.href}`}>
          <Link
            href={a.href}
            className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/20 transition-colors group"
          >
            <span className="mt-0.5 text-[10px] text-[hsl(var(--color-acento))] select-none">
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
