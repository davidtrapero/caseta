import { z } from "zod";

// Turno = tramo horario en una caseta, con 0..N empleados asignados (Fase 3).
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

// En FormData, empleadoIds viaja como múltiples entries con la misma key
// (parseForm sólo coge la última). Para enviar lista desde el cliente se
// serializa como JSON string en el campo `empleadoIdsJson`.
const empleadoIdsJson = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return [] as string[];
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  })
  .pipe(z.array(z.string().cuid("Empleado inválido")));

const baseTurnoRango = z
  .object({
    edicionId: z.string().cuid("Edición inválida"),
    casetaId: z.string().cuid("Caseta inválida"),
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

// Plazas esperadas por tipo: serializado como JSON en un campo hidden.
const plazasJson = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return [] as { tipoEmpleadoId: string; cantidad: number }[];
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })
  .pipe(
    z.array(
      z.object({
        tipoEmpleadoId: z.string().cuid("Tipo de empleado inválido"),
        cantidad: z.coerce.number().int().min(0).max(99),
      })
    )
  );

// Crear: rango + lista opcional de empleados (0..N).
export const crearTurnoSchema = z
  .object({
    edicionId: z.string().cuid("Edición inválida"),
    casetaId: z.string().cuid("Caseta inválida"),
    fechaInicio: isoDateTime,
    fechaFin: isoDateTime,
    empleadoIdsJson,
    plazasJson,
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

// Actualizar: sólo horario del turno; las asignaciones se gestionan aparte.
export const actualizarTurnoSchema = baseTurnoRango;

export const asignarEmpleadoSchema = z.object({
  turnoId: z.string().cuid(),
  empleadoId: z.string().cuid(),
});

export const desasignarEmpleadoSchema = z.object({
  turnoId: z.string().cuid(),
  empleadoId: z.string().cuid(),
});

export const toggleAsistenciaSchema = z.object({
  turnoId: z.string().cuid(),
  empleadoId: z.string().cuid(),
  asistio: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()),
});

// Duplicar un día completo dentro de una caseta: copia todos los turnos
// (con sus asignaciones) cuyo fechaInicio cae en el día origen al día destino.
export const duplicarDiaSchema = z
  .object({
    casetaId: z.string().cuid(),
    edicionId: z.string().cuid(),
    diaOrigen: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
    diaDestino: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  })
  .refine((d) => d.diaOrigen !== d.diaDestino, {
    message: "El día origen y destino deben ser diferentes",
    path: ["diaDestino"],
  });

// Duplicar semana completa (incluye asignaciones).
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

export const actualizarPlazasSchema = z.object({
  turnoId: z.string().cuid(),
  plazasJson,
});

export type CrearTurnoInput = z.infer<typeof crearTurnoSchema>;
export type ActualizarTurnoInput = z.infer<typeof actualizarTurnoSchema>;
export type AsignarEmpleadoInput = z.infer<typeof asignarEmpleadoSchema>;
export type DesasignarEmpleadoInput = z.infer<typeof desasignarEmpleadoSchema>;
export type ToggleAsistenciaInput = z.infer<typeof toggleAsistenciaSchema>;
export type DuplicarDiaInput = z.infer<typeof duplicarDiaSchema>;
export type DuplicarSemanaInput = z.infer<typeof duplicarSemanaSchema>;
export type ActualizarPlazasInput = z.infer<typeof actualizarPlazasSchema>;
