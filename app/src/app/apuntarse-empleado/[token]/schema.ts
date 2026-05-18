import { z } from "zod";

const arrayDeIds = z
  .array(z.string().min(1))
  .min(1, "Selecciona al menos un turno")
  .max(20, "Máximo 20 turnos por solicitud")
  .refine(
    (a) => new Set(a).size === a.length,
    { message: "Hay turnos duplicados" }
  );

export const crearSolicitudEmpleadoSchema = z
  .object({
    dni: z
      .string()
      .trim()
      .min(1, "DNI es obligatorio")
      .max(20, "DNI inválido"),
    nombre: z
      .string()
      .trim()
      .min(1, "Completa el nombre")
      .max(120, "Máximo 120 caracteres"),
    apellidos: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().max(120).optional()
    ),
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

export type CrearSolicitudEmpleadoInput = z.infer<typeof crearSolicitudEmpleadoSchema>;
