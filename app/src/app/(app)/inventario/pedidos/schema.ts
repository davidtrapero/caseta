import { z } from "zod";

const lineasJson = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return [] as unknown[];
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })
  .pipe(
    z
      .array(
        z.object({
          productoId: z.string().min(1, "Producto inválido"),
          cantidad: z.coerce
            .number({ error: "Cantidad inválida" })
            .positive("La cantidad debe ser mayor que 0.")
            .max(999999, "Cantidad demasiado alta"),
          precioUnitario: z.coerce
            .number({ error: "Precio inválido" })
            .min(0, "El precio no puede ser negativo")
            .max(9999999, "Precio demasiado alto"),
        })
      )
      .min(1, "Añade al menos una línea al pedido.")
  );

const baseProducto = z.object({
  proveedorId: z.string().min(1, "Proveedor inválido"),
  casetaId: z.string().min(1, "Caseta inválida"),
  lineasJson,
});

export const crearPedidoSchema = baseProducto;
export const editarPedidoSchema = baseProducto;

export type CrearPedidoInput = z.infer<typeof crearPedidoSchema>;
