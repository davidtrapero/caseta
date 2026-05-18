import { z } from "zod";

export const aprobarTurnosSchema = z.object({
  solicitudId: z.string().min(1),
  turnoIds: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.string().min(1)).min(1, "Selecciona al menos un turno")
  ),
});

export type AprobarTurnosInput = z.infer<typeof aprobarTurnosSchema>;

export const rechazarTurnosSchema = z.object({
  solicitudId: z.string().min(1),
  turnoIds: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.string().min(1)).min(1, "Selecciona al menos un turno.")
  ),
  motivo: z.string().trim().min(5, "Proporciona al menos 5 caracteres de motivo.").max(500, "Máximo 500 caracteres."),
});

export type RechazarTurnosInput = z.infer<typeof rechazarTurnosSchema>;

// Esquemas para solicitudes de empleados
export const aprobarTurnosEmpleadoSchema = z.object({
  solicitudId: z.string().min(1),
  turnoIds: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.string().min(1)).min(1, "Selecciona al menos un turno")
  ),
});

export type AprobarTurnosEmpleadoInput = z.infer<typeof aprobarTurnosEmpleadoSchema>;

export const rechazarTurnosEmpleadoSchema = z.object({
  solicitudId: z.string().min(1),
  turnoIds: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.string().min(1)).min(1, "Selecciona al menos un turno.")
  ),
  motivo: z.string().trim().min(5, "Proporciona al menos 5 caracteres de motivo.").max(500, "Máximo 500 caracteres."),
});

export type RechazarTurnosEmpleadoInput = z.infer<typeof rechazarTurnosEmpleadoSchema>;

// Aprobar/rechazar solicitud completa de empleado (toda la solicitud de una vez).
export const aprobarSolicitudEmpleadoSchema = z.object({
  solicitudId: z.string().min(1),
  aprobar: z.preprocess((v) => v === "true" || v === true, z.boolean()),
  motivoRechazo: z.string().trim().max(500).optional(),
});

export type AprobarSolicitudEmpleadoInput = z.infer<typeof aprobarSolicitudEmpleadoSchema>;
