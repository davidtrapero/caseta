// Utilidades de fechas para vistas de turnos.
// Trabajamos en zona local del servidor/cliente para los "días"; los timestamps
// ISO de los turnos vienen del backend como UTC y se formatean con Intl.

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

/** Formato "HH:MM" a partir de un ISO timestamp (zona local). */
export function horaDe(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Horas enteras transcurridas entre dos ISO (redondeado hacia arriba). */
export function duracionHoras(inicio: string, fin: string): number {
  const ms = new Date(fin).getTime() - new Date(inicio).getTime();
  return Math.round(ms / 3_600_000);
}

const FECHA_LARGA = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatFechaLarga(ymd: string): string {
  return FECHA_LARGA.format(fromYmd(ymd));
}

const FECHA_CORTA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

export function formatFechaCorta(ymd: string): string {
  return FECHA_CORTA.format(fromYmd(ymd));
}
