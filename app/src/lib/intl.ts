/** Formateadores Intl centralizados. Reutilizables en Server y Client Components. */

/** Moneda euros con decimales: "12,50 €" */
export const FMT_EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

/** Moneda euros sin decimales: "12 €" — para KPIs y gráficos de resumen */
export const FMT_EUR_ENTERO = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** Fecha corta con timezone UTC (fechas de BD almacenadas como UTC): "12 ene. 2025" */
export const FMT_FECHA_UTC = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Fecha corta en hora local del navegador/servidor: "12 ene. 2025" */
export const FMT_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Fecha y hora en hora local: "12 ene. 2025, 14:30" */
export const FMT_FECHA_HORA = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Fecha larga sin timezone: "lunes, 12 de enero de 2025" */
export const FMT_FECHA_LARGA = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Hora HH:MM sin timezone explícito */
export const FMT_HORA = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Tiempo relativo: "hace 3 días", "en 2 horas" */
export const FMT_FECHA_RELATIVA = new Intl.RelativeTimeFormat("es-ES", {
  numeric: "auto",
});
