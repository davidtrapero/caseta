import { z } from "zod";

// Turno = tramo horario dentro de un día (o cruzando medianoche).
// fechaInicio y fechaFin son timestamps ISO (DateTime completos).
// Granularidad: hora exacta (minuto === 0).
// Cross-midnight: permitido. fechaFin puede ser del día siguiente de fechaInicio.

const horaExacta = (v: unknown) => {
  if (typeof v !== "string") return false;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return false;
  return d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
};

const isoDateTime = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Fecha/hora inválida")
  .refine(horaExacta, "Sólo horas en punto (minuto = 0)");

const baseTurno = z
  .object({
    edicionId: z.string().cuid("Edición inválida"),
    casetaId: z.string().cuid("Caseta inválida"),
    empleadoId: z.string().cuid("Empleado inválido"),
    fechaInicio: isoDateTime,
    fechaFin: isoDateTime,
  })
  .refine(
    (d) => new Date(d.fechaFin).getTime() > new Date(d.fechaInicio).getTime(),
    { message: "La fecha fin debe ser posterior a la fecha inicio", path: ["fechaFin"] }
  )
  .refine(
    (d) => {
      const ms = new Date(d.fechaFin).getTime() - new Date(d.fechaInicio).getTime();
      return ms <= 24 * 60 * 60 * 1000;
    },
    { message: "Un turno no puede durar más de 24 horas", path: ["fechaFin"] }
  );

export const crearTurnoSchema = baseTurno;
export const actualizarTurnoSchema = baseTurno;

export const toggleAsistenciaSchema = z.object({
  turnoId: z.string().cuid(),
  asistio: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()),
});

// Duplicar una semana completa dentro de una caseta: copia todos los turnos
// cuyo fechaInicio cae en la semana origen a la semana destino, preservando
// el offset relativo (mismo día-de-semana y misma hora).
// "lunesOrigen" y "lunesDestino" son fechas ISO (YYYY-MM-DD) del lunes de cada semana.
export const duplicarSemanaSchema = z
  .object({
    casetaId: z.string().cuid(),
    edicionId: z.string().cuid(),
    lunesOrigen: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
    lunesDestino: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  })
  .refine((d) => d.lunesOrigen !== d.lunesDestino, {
    message: "La semana origen y destino deben ser diferentes",
    path: ["lunesDestino"],
  });

export type CrearTurnoInput = z.infer<typeof crearTurnoSchema>;
export type ActualizarTurnoInput = z.infer<typeof actualizarTurnoSchema>;
export type ToggleAsistenciaInput = z.infer<typeof toggleAsistenciaSchema>;
export type DuplicarSemanaInput = z.infer<typeof duplicarSemanaSchema>;
