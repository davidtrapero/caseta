import { z } from "zod";

const rolSchema = z.enum(["admin", "gerente", "cajero"]);

export const crearUsuarioSchema = z.object({
  email: z.email({ error: "Email inválido" }).max(160),
  name: z.string().trim().min(2, "Completa el nombre").max(120),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(100),
  rol: rolSchema,
  activo: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export const actualizarUsuarioSchema = z.object({
  name: z.string().trim().min(2, "Completa el nombre").max(120),
  rol: rolSchema,
  activo: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
