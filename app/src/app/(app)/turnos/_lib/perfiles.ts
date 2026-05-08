// Tipo de empleado — antes era enum hardcoded. Ahora vive en la tabla
// TipoEmpleado (editable desde admin). Este archivo expone solo helpers
// puros que reciben los datos ya cargados; los componentes/server actions
// hacen el findMany y los pasan por props.

export type TipoEmpleadoLite = {
  id: string;
  slug: string;
  label: string;
  labelCorto: string;
  colorHex: string;
  esVoluntario: boolean;
  orden: number;
};

export type ColoresTipo = { bg: string; border: string; text: string };

// Convierte "#RRGGBB" → {r,g,b} en 0..255.
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

// Luminancia relativa (sRGB). Usada para decidir contraste de texto.
function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const conv = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
}

// Mezcla un color con blanco (factor 0..1, donde 1 = blanco puro).
function mixWithWhite(rgb: { r: number; g: number; b: number }, factor: number) {
  return {
    r: Math.round(rgb.r + (255 - rgb.r) * factor),
    g: Math.round(rgb.g + (255 - rgb.g) * factor),
    b: Math.round(rgb.b + (255 - rgb.b) * factor),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Deriva la tripleta {bg, border, text} a partir del colorHex base.
 * - border = colorHex (color base, fuerte)
 * - bg     = colorHex mezclado con blanco al 78% (tinte suave)
 * - text   = blanco si el border es oscuro, oscuro saturado si es claro
 */
export function colorFor(tipo: { colorHex: string }): ColoresTipo {
  const base = hexToRgb(tipo.colorHex);
  const bg = rgbToHex(mixWithWhite(base, 0.78));
  const lum = luminance(base);
  // Para fondos claros usamos un texto oscuro derivado del color.
  const textDark = rgbToHex({
    r: Math.round(base.r * 0.35),
    g: Math.round(base.g * 0.35),
    b: Math.round(base.b * 0.35),
  });
  return {
    bg,
    border: tipo.colorHex,
    text: lum < 0.35 ? "#fdf8ec" : textDark,
  };
}

export function ordenarTipos<T extends { orden: number }>(tipos: T[]): T[] {
  return [...tipos].sort((a, b) => a.orden - b.orden);
}
