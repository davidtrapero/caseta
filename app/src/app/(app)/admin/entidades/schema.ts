import { z } from "zod";

const nombreEntidad = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(80, "Máximo 80 caracteres");

export const crearEntidadSchema = z.object({
  nombre: nombreEntidad,
});

export const renombrarEntidadSchema = z.object({
  nombre: nombreEntidad,
});

export type CrearEntidadInput = z.infer<typeof crearEntidadSchema>;
export type RenombrarEntidadInput = z.infer<typeof renombrarEntidadSchema>;
