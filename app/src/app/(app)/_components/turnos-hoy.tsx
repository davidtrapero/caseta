import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { TurnoHoyData } from "../_lib/dashboard";

export function TurnosHoy({ turnos }: { turnos: TurnoHoyData[] }) {
  if (turnos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/40 p-6 text-center text-sm text-muted-foreground">
        Sin turnos registrados para hoy.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Caseta
            </th>
            <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Horario
            </th>
            <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Personal
            </th>
            <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {turnos.map((t) => (
            <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2 font-medium">{t.casetaNombre}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {t.horaInicio}–{t.horaFin}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                {t.plazasTotales > 0 ? (
                  <span className={t.asignados < t.plazasTotales ? "text-destructive-foreground" : ""}>
                    {t.asignados}/{t.plazasTotales}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t.asignados}</span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                {t.cubierto ? (
                  <Badge variant="active" className="text-[10px]">Cubierto</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive-foreground">
                    Faltan plazas
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t bg-muted/10">
        <Link href="/turnos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Ver todos los turnos →
        </Link>
      </div>
    </div>
  );
}
