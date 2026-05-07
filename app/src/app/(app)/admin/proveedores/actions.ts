"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { crearProveedorSchema, actualizarProveedorSchema } from "./schema";

export async function crearProveedorAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(crearProveedorSchema, formData);

    await withAuditContext(user.id, () =>
      prisma.proveedor.create({
        data: {
          nombre: data.nombre,
          contacto: data.contacto ?? null,
          email: data.email ?? null,
          telefono: data.telefono ?? null,
          activo: data.activo,
        },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/proveedores");
  redirect("/admin/proveedores");
}

export async function actualizarProveedorAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(actualizarProveedorSchema, formData);

    await withAuditContext(user.id, () =>
      prisma.proveedor.update({
        where: { id },
        data: {
          nombre: data.nombre,
          contacto: data.contacto ?? null,
          email: data.email ?? null,
          telefono: data.telefono ?? null,
          activo: data.activo,
        },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/proveedores");
  redirect("/admin/proveedores");
}

export async function toggleActivoProveedorAction(
  _prev: ActionResult<{ activo: boolean }> | null,
  formData: FormData
): Promise<ActionResult<{ activo: boolean }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const actual = await prisma.proveedor.findUnique({
      where: { id },
      select: { activo: true },
    });
    if (!actual) {
      return { ok: false, error: "Proveedor no encontrado." };
    }

    const actualizado = await withAuditContext(user.id, () =>
      prisma.proveedor.update({ where: { id }, data: { activo: !actual.activo } })
    );

    revalidatePath("/admin/proveedores");
    return { ok: true, data: { activo: actualizado.activo } };
  } catch (err) {
    return toActionError(err);
  }
}
