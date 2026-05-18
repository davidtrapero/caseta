import { z } from "zod";
import { CATEGORIAS_GASTO } from "./_lib/categorias";

const fechaYmd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");

const montoDecimal = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce
    .number({ error: "Monto inválido" })
    .min(0.01, "El monto debe ser mayor a 0")
    .max(99999999.99, "Monto demasiado alto")
);

const descripcion = z
  .string()
  .trim()
  .min(2, "Completa la descripción")
  .max(300);

const categoriaEnum = z.enum(CATEGORIAS_GASTO);

// casetaId: si viene vacío o "__central__" ⇒ null (gasto transversal).
const casetaOpcional = z.preprocess(
  (v) => {
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    if (t === "" || t === "__central__") return undefined;
    return t;
  },
  z.string().min(1, "Caseta inválida").optional()
);

export const crearGastoSchema = z.object({
  descripcion,
  monto: montoDecimal,
  categoria: categoriaEnum,
  fecha: fechaYmd,
  casetaId: casetaOpcional,
});

export const actualizarGastoSchema = crearGastoSchema;

export type CrearGastoInput = z.infer<typeof crearGastoSchema>;
