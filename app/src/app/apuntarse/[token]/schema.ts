import { z } from "zod";

const arrayDeIds = z
  .array(z.cuid())
  .min(1, "Selecciona al menos un turno")
  .max(20, "Máximo 20 turnos por solicitud")
  .refine(
    (a) => new Set(a).size === a.length,
    { message: "Hay turnos duplicados" }
  );

export const crearSolicitudSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, "El nombre es obligatorio")
      .max(120, "Máximo 120 caracteres"),
    telefono: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z
        .string()
        .trim()
        .regex(/^\+?[0-9 .\-]{6,20}$/, "Teléfono inválido")
        .optional()
    ),
    email: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().email("Email inválido").optional()
    ),
    entidadId: z.cuid({ error: "Selecciona una entidad" }),
    observaciones: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().max(500).optional()
    ),
    turnoIds: z.preprocess((v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string") {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed : [v];
        } catch {
          return [v];
        }
      }
      return v;
    }, arrayDeIds),
  })
  .refine((d) => d.email || d.telefono, {
    message: "Indica al menos email o teléfono",
    path: ["email"],
  });

export type CrearSolicitudInput = z.infer<typeof crearSolicitudSchema>;
