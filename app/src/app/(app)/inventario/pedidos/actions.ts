"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import {
  parseForm,
  toActionError,
  type ActionResult,
} from "@/lib/action-result";
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
    select: { id: true, casetaId: true, activo: true },
  });
  if (productos.length !== productoIds.length) {
    return "Algún producto no existe.";
  }
  for (const p of productos) {
    if (p.casetaId !== casetaId) {
      return "Todos los productos deben pertenecer a la caseta seleccionada.";
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
  let nuevoId: string | null = null;
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(crearPedidoSchema, formData);

    const edicion = await obtenerEdicionActiva();
    if (!edicion) return { ok: false, error: "No hay edición activa." };

    const errProd = await validarProductosEnCaseta(
      data.lineasJson.map((l) => l.productoId),
      data.casetaId
    );
    if (errProd) return { ok: false, error: errProd };

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
    return toActionError(err);
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

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(editarPedidoSchema, formData);

    const existente = await prisma.pedido.findUnique({
      where: { id },
      select: { estado: true },
    });
    if (!existente) return { ok: false, error: "Pedido no encontrado." };
    if (existente.estado !== "pendiente") {
      return {
        ok: false,
        error: `No se puede editar un pedido ${existente.estado}.`,
      };
    }

    const errProd = await validarProductosEnCaseta(
      data.lineasJson.map((l) => l.productoId),
      data.casetaId
    );
    if (errProd) return { ok: false, error: errProd };

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
    return toActionError(err);
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
    const { user } = await requireRole(["admin", "gerente"]);

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
          throw new Error("El pedido no tiene líneas.");
        }

        await tx.pedido.update({
          where: { id },
          data: {
            estado: "recibido",
            fechaRecepcion: new Date(),
          },
        });

        for (const d of pedido.detalles) {
          const cantidad = Number(d.cantidad);
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
    const { user } = await requireRole(["admin", "gerente"]);

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
