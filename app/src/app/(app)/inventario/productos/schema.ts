import { z } from "zod";

const opcional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional()
  );

const baseProducto = z.object({
  casetaId: z.string().min(1, "Caseta inválida"),
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(120),
  unidad: opcional(40),
  activo: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export const crearProductoSchema = baseProducto;
export const actualizarProductoSchema = baseProducto;

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
