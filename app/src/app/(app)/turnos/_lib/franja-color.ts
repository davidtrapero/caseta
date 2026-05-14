import type { FranjaHoraria } from "./fechas";

export type ColoresFranja = {
  /** Fondo suave (color-mix con transparente) para gradiente. */
  bg: string;
  /** Color sólido para borde/barra lateral fuerte. */
  barra: string;
  /** Etiqueta legible para tooltips/aria. */
  label: string;
};

const COLORES: Record<FranjaHoraria, ColoresFranja> = {
  manana: {
    bg: "color-mix(in oklab, hsl(var(--primary)) 18%, transparent)",
    barra: "hsl(var(--primary))",
    label: "Mañana",
  },
  tarde: {
    bg: "color-mix(in oklab, hsl(var(--secondary)) 22%, transparent)",
    barra: "hsl(var(--secondary))",
    label: "Tarde",
  },
  noche: {
    bg: "color-mix(in oklab, hsl(var(--accent)) 22%, transparent)",
    barra: "hsl(var(--accent))",
    label: "Noche",
  },
};

export function coloresFranja(franja: FranjaHoraria): ColoresFranja {
  return COLORES[franja];
}
