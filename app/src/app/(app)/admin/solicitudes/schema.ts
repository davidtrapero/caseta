import { z } from "zod";

export const decidirSolicitudSchema = z.object({
  solicitudId: z.cuid(),
});

export type DecidirSolicitudInput = z.infer<typeof decidirSolicitudSchema>;

export const rechazarSolicitudSchema = z.object({
  solicitudId: z.cuid(),
  motivo: z.string().trim().min(5, "El motivo debe tener al menos 5 caracteres").max(500, "Máximo 500 caracteres"),
});

export type RechazarSolicitudInput = z.infer<typeof rechazarSolicitudSchema>;
