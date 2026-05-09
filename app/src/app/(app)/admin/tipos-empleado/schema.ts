import { z } from "zod";

const slugRegex = /^[a-z][a-z0-9_-]*$/;
const colorHexRegex = /^#[0-9a-fA-F]{6}$/;

const checkbox = z.preprocess((v) => v === "on" || v === true, z.boolean());

const baseTipoEmpleado = z.object({
  label: z
    .string()
    .trim()
    .min(2, "El label es obligatorio (mínimo 2 caracteres).")
    .max(64, "Máximo 64 caracteres."),
  labelCorto: z
    .string()
    .trim()
    .min(1, "El label corto es obligatorio.")
    .max(8, "Máximo 8 caracteres."),
  colorHex: z
    .string()
    .trim()
    .regex(colorHexRegex, "Formato esperado: #RRGGBB."),
  orden: z.coerce
    .number({ error: "El orden debe ser numérico." })
    .int("El orden debe ser entero.")
    .min(0, "El orden no puede ser negativo."),
  esVoluntario: checkbox,
  activo: checkbox,
});

export const crearTipoEmpleadoSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "El slug es obligatorio (mínimo 2 caracteres).")
    .max(32, "Máximo 32 caracteres.")
    .regex(slugRegex, "Solo minúsculas, dígitos, '-' o '_'. Debe empezar por letra."),
  label: baseTipoEmpleado.shape.label,
  labelCorto: baseTipoEmpleado.shape.labelCorto,
  colorHex: baseTipoEmpleado.shape.colorHex,
  esVoluntario: baseTipoEmpleado.shape.esVoluntario,
});

export const actualizarTipoEmpleadoSchema = baseTipoEmpleado;

export type CrearTipoEmpleadoInput = z.infer<typeof crearTipoEmpleadoSchema>;
export type ActualizarTipoEmpleadoInput = z.infer<typeof actualizarTipoEmpleadoSchema>;
