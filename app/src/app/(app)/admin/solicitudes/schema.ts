import { z } from "zod";

export const decidirSolicitudSchema = z.object({
  solicitudId: z.cuid(),
});

export type DecidirSolicitudInput = z.infer<typeof decidirSolicitudSchema>;
