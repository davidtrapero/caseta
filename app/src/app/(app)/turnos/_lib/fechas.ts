// Utilidades puras de fechas para el módulo Turnos.
// Todo opera en zona local del servidor/cliente — los ISO se construyen con Date nativo.
// Granularidad de horas en punto.

const DIA_MS = 24 * 60 * 60 * 1000;

/** Devuelve el lunes 00:00 de la semana que contiene `d` (lunes = inicio). */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = r.getDay(); // 0=domingo..6=sábado
  const diff = dow === 0 ? -6 : 1 - dow;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function addHours(d: Date, hours: number): Date {
  const r = new Date(d);
  r.setHours(r.getHours() + hours);
  return r;
}

/** Formato YYYY-MM-DD (local). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parsea YYYY-MM-DD a Date local a las 00:00. */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Formato hora simple sin minutos cuando son 0 (ej "20h"). */
export function formatHour(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}h`;
}

/** Formato "YYYY-Www" ISO-ish (usamos semana calendario basada en lunes, no ISO estricta). */
export function toWeekCode(lunes: Date): string {
  const year = lunes.getFullYear();
  // Número de semana relativo al primer lunes del año (simple, determinista).
  const firstJan = new Date(year, 0, 1);
  const firstMon = startOfWeek(firstJan);
  const weekNo = Math.round((lunes.getTime() - firstMon.getTime()) / (7 * DIA_MS)) + 1;
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

/** Inverso aproximado de toWeekCode → devuelve el lunes de esa semana. */
export function fromWeekCode(code: string): Date | null {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(code);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  const firstMon = startOfWeek(new Date(year, 0, 1));
  return addDays(firstMon, (week - 1) * 7);
}

const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function nombreDia(d: Date): string {
  return DIAS_LARGOS[(d.getDay() + 6) % 7];
}
export function nombreDiaCorto(d: Date): string {
  return DIAS_CORTOS[(d.getDay() + 6) % 7];
}

export function formatFechaCorta(d: Date): string {
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

export function formatRangoSemana(lunes: Date, domingo: Date): string {
  if (lunes.getMonth() === domingo.getMonth()) {
    return `${lunes.getDate()}–${domingo.getDate()} ${MESES_CORTOS[lunes.getMonth()]} ${lunes.getFullYear()}`;
  }
  if (lunes.getFullYear() === domingo.getFullYear()) {
    return `${lunes.getDate()} ${MESES_CORTOS[lunes.getMonth()]} – ${domingo.getDate()} ${MESES_CORTOS[domingo.getMonth()]} ${lunes.getFullYear()}`;
  }
  return `${formatFechaCorta(lunes)} ${lunes.getFullYear()} – ${formatFechaCorta(domingo)} ${domingo.getFullYear()}`;
}

/** Devuelve DATE(fechaInicio) como YYYY-MM-DD local. */
export function fechaTurnoDate(iso: string): string {
  return toIsoDate(new Date(iso));
}
