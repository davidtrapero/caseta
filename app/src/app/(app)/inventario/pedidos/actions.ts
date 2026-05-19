"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { crearPedidoSchema, editarPedidoSchema } from "./schema";

function calcularTotal(
  lineas: { cantidad: number; precioUnitario: number }[]
): number {
  return lineas.reduce(
    (acc, l) => acc + l.cantidad * l.precioUnitario,
    0
  );
}

async function validarProductosEnCaseta(
  productoIds: string[],
  casetaId: string
): Promise<string | null> {
  const productos = await prisma.producto.findMany({
    where: { id: { in: productoIds } },
    select: {
      id: true,
      activo: true,
      casetas: { select: { casetaId: true } },
    },
  });
  if (productos.length !== productoIds.length) {
    return "Algún producto no existe.";
  }
  for (const p of productos) {
    if (!p.casetas.some((c) => c.casetaId === casetaId)) {
      return "Algún producto no está vinculado a esta caseta.";
    }
    if (!p.activo) {
      return "No se pueden pedir productos desactivados.";
    }
  }
  return null;
}

export async function crearPedidoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const values = formDataToObject(formData);
  let nuevoId: string | null = null;
  try {
    const { user } = await requirePermiso("inventario.pedidos.crear");
    const data = parseForm(crearPedidoSchema, formData);

    const edicion = await obtenerEdicionActiva();
    if (!edicion) return { ok: false, error: "No hay edición activa.", values };

    const errProd = await validarProductosEnCaseta(
      data.lineasJson.map((l) => l.productoId),
      data.casetaId
    );
    if (errProd) return { ok: false, error: errProd, values };

    const total = calcularTotal(data.lineasJson);

    const pedido = await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        const p = await tx.pedido.create({
          data: {
            edicionId: edicion.id,
            proveedorId: data.proveedorId,
            casetaId: data.casetaId,
            total,
            estado: "pendiente",
          },
        });
        for (const l of data.lineasJson) {
          await tx.detallePedido.create({
            data: {
              pedidoId: p.id,
              productoId: l.productoId,
              cantidad: l.cantidad,
              precioUnitario: l.precioUnitario,
            },
          });
        }
        return p;
      })
    );

    nuevoId = pedido.id;
  } catch (err) {
    const base = toActionError(err);
    return base.ok ? base : { ...base, values };
  }

  revalidatePath("/inventario/pedidos");
  if (nuevoId) redirect(`/inventario/pedidos/${nuevoId}`);
  return { ok: true, data: { id: nuevoId ?? "" } };
}

export async function editarPedidoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  const values = formDataToObject(formData);
  try {
    const { user } = await requirePermiso("inventario.pedidos.crear");
    const data = parseForm(editarPedidoSchema, formData);

    const existente = await prisma.pedido.findUnique({
      where: { id },
      select: { estado: true },
    });
    if (!existente) return { ok: false, error: "Pedido no encontrado.", values };
    if (existente.estado !== "pendiente") {
      return {
        ok: false,
        error: `No se puede editar un pedido ${existente.estado}.`,
        values,
      };
    }

    const errProd = await validarProductosEnCaseta(
      data.lineasJson.map((l) => l.productoId),
      data.casetaId
    );
    if (errProd) return { ok: false, error: errProd, values };

    const total = calcularTotal(data.lineasJson);

    await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        await tx.pedido.update({
          where: { id },
          data: {
            proveedorId: data.proveedorId,
            casetaId: data.casetaId,
            total,
          },
        });
        await tx.detallePedido.deleteMany({ where: { pedidoId: id } });
        for (const l of data.lineasJson) {
          await tx.detallePedido.create({
            data: {
              pedidoId: id,
              productoId: l.productoId,
              cantidad: l.cantidad,
              precioUnitario: l.precioUnitario,
            },
          });
        }
      })
    );
  } catch (err) {
    const base = toActionError(err);
    return base.ok ? base : { ...base, values };
  }

  revalidatePath("/inventario/pedidos");
  revalidatePath(`/inventario/pedidos/${id}`);
  redirect(`/inventario/pedidos/${id}`);
}

export async function recibirPedidoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requirePermiso("inventario.pedidos.crear");

    const edicion = await obtenerEdicionActiva();
    if (!edicion) return { ok: false, error: "No hay edición activa." };

    await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        const pedido = await tx.pedido.findUnique({
          where: { id },
          select: {
            id: true,
            casetaId: true,
            estado: true,
            detalles: {
              select: {
                productoId: true,
                cantidad: true,
              },
            },
          },
        });
        if (!pedido) throw new Error("Pedido no encontrado.");
        if (pedido.estado !== "pendiente") {
          throw new Error(
            `El pedido ya está ${pedido.estado}; no se puede recibir.`
          );
        }
        if (pedido.detalles.length === 0) {
          throw new Error("Añade al menos una línea al pedido.");
        }

        await tx.pedido.update({
          where: { id },
          data: {
            estado: "recibido",
            fechaRecepcion: new Date(),
          },
        });

        for (const d of pedido.detalles) {
          const cantidad = d.cantidad;
          await tx.movimientoStock.create({
            data: {
              edicionId: edicion.id,
              casetaId: pedido.casetaId,
              productoId: d.productoId,
              tipo: "entrada",
              cantidad,
              usuarioId: user.id,
              nota: `Recepción pedido ${pedido.id}`,
            },
          });

          await tx.stock.upsert({
            where: {
              casetaId_productoId: {
                casetaId: pedido.casetaId,
                productoId: d.productoId,
              },
            },
            create: {
              casetaId: pedido.casetaId,
              productoId: d.productoId,
              cantidad,
            },
            update: { cantidad: { increment: cantidad } },
          });
        }
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/inventario/pedidos");
  revalidatePath(`/inventario/pedidos/${id}`);
  revalidatePath("/inventario/stock");
  revalidatePath("/inventario/movimientos");
  return { ok: true, data: { id } };
}

export async function cancelarPedidoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requirePermiso("inventario.pedidos.crear");

    const existente = await prisma.pedido.findUnique({
      where: { id },
      select: { estado: true },
    });
    if (!existente) return { ok: false, error: "Pedido no encontrado." };
    if (existente.estado !== "pendiente") {
      return {
        ok: false,
        error: `Solo se pueden cancelar pedidos pendientes (actual: ${existente.estado}).`,
      };
    }

    await withAuditContext(user.id, () =>
      prisma.pedido.update({
        where: { id },
        data: { estado: "cancelado" },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/inventario/pedidos");
  revalidatePath(`/inventario/pedidos/${id}`);
  return { ok: true, data: { id } };
}
