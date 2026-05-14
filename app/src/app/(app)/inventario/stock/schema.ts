import { z } from "zod";

const cantidadDecimal = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce
    .number({ error: "Cantidad inválida" })
    .min(0, "La cantidad no puede ser negativa")
    .max(999999999, "Cantidad demasiado alta")
);

const notaOpcional = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(300).optional()
);

export const ajustarStockSchema = z.object({
  casetaId: z.string().min(1, "Caseta inválida"),
  productoId: z.string().min(1, "Producto inválido"),
  nuevaCantidad: cantidadDecimal,
  nota: notaOpcional,
});

export type AjustarStockInput = z.infer<typeof ajustarStockSchema>;
