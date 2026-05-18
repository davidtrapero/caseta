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
import { formDataToObject } from "@/lib/forms";
import { crearProductoSchema, actualizarProductoSchema } from "./schema";

export async function crearProductoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const values = formDataToObject(formData);
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(crearProductoSchema, formData);

    const caseta = await prisma.caseta.findUnique({
      where: { id: data.casetaId },
      select: { activa: true },
    });
    if (!caseta) return { ok: false, error: "Caseta no encontrada.", values };

    await withAuditContext(user.id, () =>
      prisma.producto.create({
        data: {
          casetaId: data.casetaId,
          nombre: data.nombre,
          unidad: data.unidad ?? "unidad",
          activo: data.activo,
        },
      })
    );
  } catch (err) {
    return toActionError(err);
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

  try {
    const values = formDataToObject(formData);
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(actualizarProductoSchema, formData);

    const existente = await prisma.producto.findUnique({ where: { id } });
    if (!existente) return { ok: false, error: "Producto no encontrado.", values };

    await withAuditContext(user.id, () =>
      prisma.producto.update({
        where: { id },
        data: {
          casetaId: data.casetaId,
          nombre: data.nombre,
          unidad: data.unidad ?? "unidad",
          activo: data.activo,
        },
      })
    );
  } catch (err) {
    return toActionError(err);
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
    const { user } = await requireRole(["admin", "gerente"]);
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
