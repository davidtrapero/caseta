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
  const bgRgb = mixWithWhite(base, 0.78);
  const bg = rgbToHex(bgRgb);
  // El texto se pinta sobre `bg`, no sobre el color base — la decisión de
  // contraste debe usar la luminancia del fondo real.
  const lumBg = luminance(bgRgb);
  const textDark = rgbToHex({
    r: Math.round(base.r * 0.35),
    g: Math.round(base.g * 0.35),
    b: Math.round(base.b * 0.35),
  });
  return {
    bg,
    border: tipo.colorHex,
    text: lumBg < 0.35 ? "#fdf8ec" : textDark,
  };
}

export function ordenarTipos<T extends { orden: number }>(tipos: T[]): T[] {
  return [...tipos].sort((a, b) => a.orden - b.orden);
}

/**
 * Abrevia "Carlos Ruiz" → "Carlos R.". Tolerante a:
 * - Un solo nombre ("Madonna") → devuelve tal cual.
 * - Apellido en blanco o cadena vacía → devuelve el primer token.
 * Mantiene el primer apellido como inicial seguida de punto.
 */
export function nombreCorto(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0];
  const inicial = partes[1][0];
  if (!inicial) return partes[0];
  return `${partes[0]} ${inicial}.`;
}

/**
 * Agrupa asignaciones de un turno en perfiles operativos:
 * - coordinadores: tipos cuyo slug contiene "coordinador" o labelCorto empieza por "Coor".
 * - voluntarios: el campo `esVoluntario` del empleado (jornalDiario === null).
 * - trabajadores: tipos no-coordinador y empleado contratado (no voluntario).
 * - otros: el resto (vigilante, ayudante…).
 *
 * El criterio se evalúa en este orden: voluntario → coordinador → trabajador → otro.
 */
export type AsignacionConRol = {
  empleadoId: string;
  empleadoNombre: string;
  esVoluntario: boolean;
  tipoImputadoId: string;
};

export type GruposAsignaciones<A extends AsignacionConRol> = {
  coordinadores: A[];
  trabajadores: A[];
  voluntarios: A[];
  otros: A[];
};

function esCoordinador(tipo: TipoEmpleadoLite | undefined): boolean {
  if (!tipo) return false;
  const slug = tipo.slug.toLowerCase();
  if (slug.includes("coordinador") || slug.includes("encargado")) return true;
  return tipo.labelCorto.toLowerCase().startsWith("coor");
}

function esTrabajadorBase(tipo: TipoEmpleadoLite | undefined): boolean {
  if (!tipo) return false;
  const slug = tipo.slug.toLowerCase();
  return slug.includes("trabajador");
}

export function agruparPorRol<A extends AsignacionConRol>(
  asignaciones: A[],
  tipos: TipoEmpleadoLite[],
): GruposAsignaciones<A> {
  const tipoById = new Map(tipos.map((t) => [t.id, t]));
  const grupos: GruposAsignaciones<A> = {
    coordinadores: [],
    trabajadores: [],
    voluntarios: [],
    otros: [],
  };
  for (const a of asignaciones) {
    const tipo = tipoById.get(a.tipoImputadoId);
    if (a.esVoluntario) {
      grupos.voluntarios.push(a);
    } else if (esCoordinador(tipo)) {
      grupos.coordinadores.push(a);
    } else if (esTrabajadorBase(tipo)) {
      grupos.trabajadores.push(a);
    } else {
      grupos.otros.push(a);
    }
  }
  return grupos;
}

/**
 * Sub-agrupa voluntarios por su EntidadVoluntario. Devuelve un array ordenado
 * alfabéticamente por nombre de entidad. Voluntarios sin entidad caen en
 * "Sin entidad" al final.
 */
export type GrupoEntidad<A> = {
  entidadNombre: string;
  sinEntidad: boolean;
  asignaciones: A[];
};

export function agruparVoluntariosPorEntidad<
  A extends AsignacionConRol & { entidadNombre: string | null },
>(voluntarios: A[]): GrupoEntidad<A>[] {
  const porEntidad = new Map<string, A[]>();
  const sinEntidad: A[] = [];
  for (const v of voluntarios) {
    if (v.entidadNombre) {
      const arr = porEntidad.get(v.entidadNombre) ?? [];
      arr.push(v);
      porEntidad.set(v.entidadNombre, arr);
    } else {
      sinEntidad.push(v);
    }
  }
  const grupos: GrupoEntidad<A>[] = Array.from(porEntidad.entries())
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([entidadNombre, asignaciones]) => ({
      entidadNombre,
      sinEntidad: false,
      asignaciones,
    }));
  if (sinEntidad.length > 0) {
    grupos.push({ entidadNombre: "Sin entidad", sinEntidad: true, asignaciones: sinEntidad });
  }
  return grupos;
}

/**
 * Sub-agrupa "otros" (vigilante, ayudante…) por TipoEmpleado. Mantiene el
 * orden de TipoEmpleado.orden — coherente con la convención del resto del
 * dominio. Devuelve un array de { tipo, asignaciones }.
 */
export type GrupoTipo<A> = {
  tipo: TipoEmpleadoLite;
  asignaciones: A[];
};

export function agruparPorTipo<A extends AsignacionConRol>(
  asignaciones: A[],
  tipos: TipoEmpleadoLite[],
): GrupoTipo<A>[] {
  const porTipo = new Map<string, A[]>();
  for (const a of asignaciones) {
    const arr = porTipo.get(a.tipoImputadoId) ?? [];
    arr.push(a);
    porTipo.set(a.tipoImputadoId, arr);
  }
  return ordenarTipos(tipos)
    .filter((t) => porTipo.has(t.id))
    .map((tipo) => ({ tipo, asignaciones: porTipo.get(tipo.id)! }));
}
