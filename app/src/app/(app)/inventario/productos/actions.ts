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
import { crearProductoSchema, actualizarProductoSchema } from "./schema";

export async function crearProductoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const values = formDataToObject(formData);
  try {
    const { user } = await requirePermiso("inventario.productos.crud");
    const data = parseForm(crearProductoSchema, formData);

    const casetas = await prisma.caseta.findMany({
      where: { id: { in: data.casetaIds } },
      select: { id: true },
    });
    if (casetas.length !== data.casetaIds.length) {
      return { ok: false, error: "Alguna caseta no existe.", values };
    }

    await withAuditContext(user.id, () =>
      prisma.producto.create({
        data: {
          nombre: data.nombre,
          unidad: data.unidad ?? "unidad",
          activo: data.activo,
          casetas: {
            create: data.casetaIds.map((casetaId) => ({ casetaId })),
          },
        },
      })
    );
  } catch (err) {
    const base = toActionError(err);
    return base.ok ? base : { ...base, values };
  }

  revalidatePath("/inventario/productos");
  revalidatePath("/inventario/stock");
  redirect("/inventario/productos");
}

export async function actualizarProductoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  const values = formDataToObject(formData);
  try {
    const { user } = await requirePermiso("inventario.productos.crud");
    const data = parseForm(actualizarProductoSchema, formData);

    const existente = await prisma.producto.findUnique({
      where: { id },
      include: { casetas: { select: { casetaId: true } } },
    });
    if (!existente) return { ok: false, error: "Producto no encontrado.", values };

    const actuales = new Set(existente.casetas.map((c) => c.casetaId));
    const nuevas = new Set(data.casetaIds);
    const aQuitar = [...actuales].filter((c) => !nuevas.has(c));
    const aAniadir = [...nuevas].filter((c) => !actuales.has(c));

    if (aAniadir.length > 0) {
      const casetasNuevas = await prisma.caseta.findMany({
        where: { id: { in: aAniadir } },
        select: { id: true },
      });
      if (casetasNuevas.length !== aAniadir.length) {
        return { ok: false, error: "Alguna caseta no existe.", values };
      }
    }

    await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        await tx.producto.update({
          where: { id },
          data: {
            nombre: data.nombre,
            unidad: data.unidad ?? "unidad",
            activo: data.activo,
          },
        });
        if (aQuitar.length > 0) {
          await tx.productoCaseta.deleteMany({
            where: { productoId: id, casetaId: { in: aQuitar } },
          });
        }
        if (aAniadir.length > 0) {
          await tx.productoCaseta.createMany({
            data: aAniadir.map((casetaId) => ({ productoId: id, casetaId })),
          });
        }
      })
    );
  } catch (err) {
    const base = toActionError(err);
    return base.ok ? base : { ...base, values };
  }

  revalidatePath("/inventario/productos");
  revalidatePath("/inventario/stock");
  redirect("/inventario/productos");
}

export async function toggleActivoProductoAction(
  _prev: ActionResult<{ activo: boolean }> | null,
  formData: FormData
): Promise<ActionResult<{ activo: boolean }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requirePermiso("inventario.productos.crud");
    const actual = await prisma.producto.findUnique({
      where: { id },
      select: { activo: true },
    });
    if (!actual) {
      return { ok: false, error: "Producto no encontrado." };
    }

    const actualizado = await withAuditContext(user.id, () =>
      prisma.producto.update({
        where: { id },
        data: { activo: !actual.activo },
      })
    );

    revalidatePath("/inventario/productos");
    revalidatePath("/inventario/stock");
    return { ok: true, data: { activo: actualizado.activo } };
  } catch (err) {
    return toActionError(err);
  }
}
