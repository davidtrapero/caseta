import { z } from "zod";

const baseCaseta = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  ubicacion: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().max(200).optional()
    ),
  activa: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export const crearCasetaSchema = baseCaseta;
export const actualizarCasetaSchema = baseCaseta;

export type CrearCasetaInput = z.infer<typeof crearCasetaSchema>;
