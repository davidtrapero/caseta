import { z } from "zod";

const opcional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional()
  );

const baseProducto = z.object({
  casetaIds: z.preprocess(
    (v) => {
      if (typeof v !== "string" || v.trim() === "") return [];
      try {
        return JSON.parse(v);
      } catch {
        return [];
      }
    },
    z.array(z.string().min(1)).min(1, "Selecciona al menos una caseta")
  ),
  nombre: z.string().trim().min(2, "Completa el nombre").max(120),
  unidad: opcional(40),
  activo: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export const crearProductoSchema = baseProducto;
export const actualizarProductoSchema = baseProducto;

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
