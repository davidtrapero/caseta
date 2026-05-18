import { z } from "zod";

const opcionalString = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional()
  );

const emailOpcional = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.email({ error: "Email inválido" }).max(160).optional()
);

const baseProveedor = z.object({
  nombre: z.string().trim().min(2, "Completa el nombre").max(120),
  contacto: opcionalString(120),
  email: emailOpcional,
  telefono: opcionalString(40),
  activo: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export const crearProveedorSchema = baseProveedor;
export const actualizarProveedorSchema = baseProveedor;

export type CrearProveedorInput = z.infer<typeof crearProveedorSchema>;
