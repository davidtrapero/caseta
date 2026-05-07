import { obtenerEdicionActiva } from "@/lib/edicion";
import Link from "next/link";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

function formatFecha(date: Date): string {
  return FORMATO_FECHA.format(date);
}

function calcularEstado(fechaInicio: Date, fechaFin: Date, hoy: Date) {
  if (hoy < fechaInicio) return "no-empezada" as const;
  if (hoy > fechaFin) return "finalizada" as const;
  return "en-curso" as const;
}

function calcularProgreso(fechaInicio: Date, fechaFin: Date, hoy: Date): number {
  const total = fechaFin.getTime() - fechaInicio.getTime();
  if (total <= 0) return 100;
  const transcurrido = hoy.getTime() - fechaInicio.getTime();
  return Math.min(100, Math.max(0, (transcurrido / total) * 100));
}

function calcularDias(
  fechaInicio: Date,
  fechaFin: Date,
  hoy: Date
): { diaActual: number; totalDias: number } {
  const MS_DIA = 1000 * 60 * 60 * 24;
  const totalDias = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / MS_DIA) + 1;
  const diaActual = Math.min(
    totalDias,
    Math.max(1, Math.round((hoy.getTime() - fechaInicio.getTime()) / MS_DIA) + 1)
  );
  return { diaActual, totalDias };
}

export async function EdicionBanner() {
  const edicion = await obtenerEdicionActiva();

  if (!edicion) {
    return (
      <div className="w-full border-b border-border bg-muted/60 px-6 py-2 text-xs text-muted-foreground">
        Sin edición activa —{" "}
        <Link href="/admin/ediciones" className="underline underline-offset-2 hover:text-foreground">
          configurar
        </Link>
      </div>
    );
  }

  const hoy = new Date();
  // Normalizar a inicio del día para cálculo de días
  const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicio = new Date(edicion.fechaInicio);
  const fin = new Date(edicion.fechaFin);

  const estado = calcularEstado(inicio, fin, hoyNorm);
  const progreso = Math.round(calcularProgreso(inicio, fin, hoyNorm));
  const { diaActual, totalDias } = calcularDias(inicio, fin, hoyNorm);

  const etiquetaEstado =
    estado === "no-empezada"
      ? "No iniciada"
      : estado === "finalizada"
        ? "Finalizada"
        : `Día ${diaActual} de ${totalDias}`;

  return (
    <div
      className="w-full border-b border-border/60 px-4 py-2 md:px-6"
      style={{ backgroundColor: "hsl(var(--secondary) / 0.12)" }}
    >
      <div className="flex items-center gap-3 text-xs">
        {/* Nombre y fechas */}
        <span className="font-medium text-foreground truncate min-w-0">
          {edicion.nombre}
        </span>
        <span className="text-muted-foreground shrink-0">·</span>
        <span className="text-muted-foreground shrink-0">
          {formatFecha(inicio)} – {formatFecha(fin)}
        </span>
        <span className="text-muted-foreground shrink-0">·</span>

        {/* Estado + barra */}
        <span className="text-muted-foreground shrink-0">{etiquetaEstado}</span>
        {estado === "en-curso" && (
          <>
            {/* Barra de progreso */}
            <div
              className="h-1.5 w-20 shrink-0 rounded-full overflow-hidden"
              style={{ backgroundColor: "hsl(var(--border))" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progreso}%`,
                  backgroundColor: "hsl(var(--primary))",
                }}
              />
            </div>
            <span
              className="shrink-0 tabular-nums"
              style={{ color: "hsl(var(--primary))" }}
            >
              {progreso}%
            </span>
          </>
        )}
      </div>
    </div>
  );
}
