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
