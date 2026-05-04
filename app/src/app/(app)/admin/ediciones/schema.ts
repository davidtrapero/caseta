import { z } from "zod";

const anioSchema = z.coerce
  .number()
  .int("El año debe ser un entero")
  .min(2000, "Año demasiado antiguo")
  .max(2100, "Año demasiado lejano");

const fechaSchema = z.coerce.date({ error: "Fecha inválida" });

const baseEdicion = z.object({
  anio: anioSchema,
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  fechaInicio: fechaSchema,
  fechaFin: fechaSchema,
  activa: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export const crearEdicionSchema = baseEdicion.refine(
  (d) => d.fechaFin >= d.fechaInicio,
  { message: "La fecha de fin no puede ser anterior al inicio", path: ["fechaFin"] }
);

export const actualizarEdicionSchema = baseEdicion.refine(
  (d) => d.fechaFin >= d.fechaInicio,
  { message: "La fecha de fin no puede ser anterior al inicio", path: ["fechaFin"] }
);

export type CrearEdicionInput = z.infer<typeof crearEdicionSchema>;
