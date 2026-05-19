// Utilidades de fechas para vistas de turnos.
// Trabajamos en zona local del servidor/cliente para los "días"; los timestamps
// ISO de los turnos vienen del backend como UTC y se formatean con Intl.

// Convención del proyecto: los turnos se guardan en UTC pero el reloj UTC se
// trata como reloj de pared ("naive UTC"). Ej.: un turno 22:00–03:00 vive como
// `..T22:00Z` → `..T03:00Z` y se muestra como 22:00–03:00 en cualquier TZ.
// Por eso TODOS los formatters de Date deben fijar `timeZone: "UTC"`. Si no,
// en Vercel (proceso UTC) se vería bien pero en local Windows (Madrid +2)
// aparecerían +2h, y viceversa.
import { FMT_FECHA_LARGA } from "@/lib/intl";

export const TZ_TURNOS = "UTC";

export const DIAS_SEMANA_CORTOS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
export const DIAS_SEMANA_LARGOS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export function hoyIso(): string {
  return toYmd(new Date());
}

export function toYmd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function fromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(ymd: string, n: number): string {
  const d = fromYmd(ymd);
  d.setDate(d.getDate() + n);
  return toYmd(d);
}

/** Lunes (ISO) de la semana que contiene `ymd`. */
export function lunesDe(ymd: string): string {
  const d = fromYmd(ymd);
  const js = d.getDay(); // 0=dom, 1=lun...
  const offset = js === 0 ? -6 : 1 - js;
  d.setDate(d.getDate() + offset);
  return toYmd(d);
}

/** Convierte "YYYY-Www" → lunes YYYY-MM-DD. */
export function semanaIsoToLunes(iso: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(iso);
  if (!m) return lunesDe(hoyIso());
  const year = Number(m[1]);
  const week = Number(m[2]);
  // ISO week: el jueves de la semana 1 cae en la semana que contiene el 4 ene.
  const enero4 = new Date(year, 0, 4);
  const lunesSemana1 = fromYmd(lunesDe(toYmd(enero4)));
  lunesSemana1.setDate(lunesSemana1.getDate() + (week - 1) * 7);
  return toYmd(lunesSemana1);
}

export function lunesToSemanaIso(lunesYmd: string): string {
  const d = fromYmd(lunesYmd);
  // ISO week number
  const temp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Formato "HH:MM" a partir de un ISO timestamp (UTC). */
export function horaDe(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Horas enteras transcurridas entre dos ISO (redondeado hacia arriba). */
export function duracionHoras(inicio: string, fin: string): number {
  const ms = new Date(fin).getTime() - new Date(inicio).getTime();
  return Math.round(ms / 3_600_000);
}

export function formatFechaLarga(ymd: string): string {
  return FMT_FECHA_LARGA.format(fromYmd(ymd));
}

const FECHA_CORTA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

export function formatFechaCorta(ymd: string): string {
  return FECHA_CORTA.format(fromYmd(ymd));
}

// --- Helpers TZ-safe para timestamps absolutos (Date) ---
// Convención: los turnos se guardan como "naive UTC" (ver TZ_TURNOS). Estos
// helpers fijan `timeZone: "UTC"` para que la hora de pared sea consistente
// independientemente de dónde corra el proceso (Vercel UTC vs. local Madrid).

const HORA_TURNO = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ_TURNOS,
});

const DIA_LARGO_TURNO = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: TZ_TURNOS,
});

const CLAVE_DIA_TURNO = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TZ_TURNOS,
});

/** "HH:MM" del reloj de pared del turno. */
export function formatHoraTurno(d: Date): string {
  return HORA_TURNO.format(d);
}

/** "lunes, 09 de mayo" según el día del turno. */
export function formatDiaLargoTurno(d: Date): string {
  return DIA_LARGO_TURNO.format(d);
}

/** "YYYY-MM-DD" según el día del turno. Útil para agrupar por jornada. */
export function claveDiaTurno(d: Date): string {
  return CLAVE_DIA_TURNO.format(d);
}

/**
 * Rango de un turno en su reloj de pared, marcando cruce de medianoche.
 * Ej.: "22:00 – 03:00 (+1d)" para un turno que cruza al día siguiente.
 */
export function formatRangoTurno(inicio: Date, fin: Date): string {
  const cruzaDia = claveDiaTurno(inicio) !== claveDiaTurno(fin);
  const sufijo = cruzaDia ? " (+1d)" : "";
  return `${formatHoraTurno(inicio)} – ${formatHoraTurno(fin)}${sufijo}`;
}

export type FranjaHoraria = "manana" | "tarde" | "noche";

/**
 * Clasifica un turno por la hora UTC de inicio (reloj de pared, ver TZ_TURNOS).
 * - inicio < 15h → mañana (apertura/comida hasta las 15h).
 * - 15h ≤ inicio < 22h → tarde.
 * - resto → noche (desde las 22h, incluye madrugada).
 */
export function franjaHoraria(inicioIso: string): FranjaHoraria {
  const h = new Date(inicioIso).getUTCHours();
  if (h < 15) return "manana";
  if (h < 22) return "tarde";
  return "noche";
}
