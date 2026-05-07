import { z } from "zod";

export const aprobarTurnosSchema = z.object({
  solicitudId: z.cuid(),
  turnoIds: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.cuid()).min(1, "Selecciona al menos un turno")
  ),
});

export type AprobarTurnosInput = z.infer<typeof aprobarTurnosSchema>;

export const rechazarTurnosSchema = z.object({
  solicitudId: z.cuid(),
  turnoIds: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.cuid()).min(1, "Selecciona al menos un turno")
  ),
  motivo: z.string().trim().min(5, "El motivo debe tener al menos 5 caracteres").max(500, "Máximo 500 caracteres"),
});

export type RechazarTurnosInput = z.infer<typeof rechazarTurnosSchema>;
