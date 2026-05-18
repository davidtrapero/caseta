import { z } from "zod";

const baseCaseta = z.object({
  nombre: z.string().trim().min(2, "Completa el nombre").max(80),
  ubicacion: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().max(200).optional()
    ),
  activa: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  jornalDiarioDefault: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().min(0).max(9999.99).optional().nullable()
  ),
  tipoEmpleadoDefectoId: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().min(1, "Tipo de empleado inválido").optional().nullable()
  ),
});

export const crearCasetaSchema = baseCaseta;
export const actualizarCasetaSchema = baseCaseta;

export type CrearCasetaInput = z.infer<typeof crearCasetaSchema>;
