import { z } from "zod";

const fechaYmd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");

const montoDecimal = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce
    .number({ error: "Monto inválido" })
    .min(0, "El monto no puede ser negativo")
    .max(99999999.99, "Monto demasiado alto")
);

const notasOpcional = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(500).optional()
);

export const crearCierreSchema = z.object({
  casetaId: z.string().min(1, "Caseta inválida"),
  fecha: fechaYmd,
  ingresosTotales: montoDecimal,
  notas: notasOpcional,
});

export const actualizarCierreSchema = z.object({
  casetaId: z.string().min(1, "Caseta inválida"),
  fecha: fechaYmd,
  ingresosTotales: montoDecimal,
  notas: notasOpcional,
});

export type CrearCierreInput = z.infer<typeof crearCierreSchema>;
export type ActualizarCierreInput = z.infer<typeof actualizarCierreSchema>;
