"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import {
  parseForm,
  toActionError,
  type ActionResult,
} from "@/lib/action-result";
import { formDataToObject } from "@/lib/forms";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { ajustarStockSchema } from "./schema";

export async function ajustarStockAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const values = formDataToObject(formData);
    const { user } = await requirePermiso("inventario.stock.ajustar");
    const data = parseForm(ajustarStockSchema, formData);

    const edicion = await obtenerEdicionActiva();
    if (!edicion) {
      return { ok: false, error: "No hay edición activa.", values };
    }

    const producto = await prisma.producto.findUnique({
      where: { id: data.productoId },
      select: { casetaId: true, activo: true },
    });
    if (!producto) return { ok: false, error: "Producto no encontrado.", values };
    if (producto.casetaId !== data.casetaId) {
      return {
        ok: false,
        error: "El producto no pertenece a la caseta indicada.",
        values,
      };
    }

    const resultado = await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        const stockExistente = await tx.stock.findUnique({
          where: {
            casetaId_productoId: {
              casetaId: data.casetaId,
              productoId: data.productoId,
            },
          },
          select: { id: true, cantidad: true },
        });

        const anterior = stockExistente ? Number(stockExistente.cantidad) : 0;
        const diferencia = data.nuevaCantidad - anterior;

        if (diferencia === 0) {
          return stockExistente ?? { id: "", cantidad: 0 };
        }

        const stock = await tx.stock.upsert({
          where: {
            casetaId_productoId: {
              casetaId: data.casetaId,
              productoId: data.productoId,
            },
          },
          create: {
            casetaId: data.casetaId,
            productoId: data.productoId,
            cantidad: data.nuevaCantidad,
          },
          update: { cantidad: data.nuevaCantidad },
        });

        await tx.movimientoStock.create({
          data: {
            edicionId: edicion.id,
            casetaId: data.casetaId,
            productoId: data.productoId,
            tipo: "ajuste",
            cantidad: diferencia,
            usuarioId: user.id,
            nota: data.nota ?? null,
          },
        });

        return stock;
      })
    );

    revalidatePath("/inventario/stock");
    revalidatePath("/inventario/movimientos");
    return { ok: true, data: { id: resultado.id } };
  } catch (err) {
    return toActionError(err);
  }
}
