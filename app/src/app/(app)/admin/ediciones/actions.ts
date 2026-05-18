"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { formDataToObject } from "@/lib/forms";
import { crearEdicionSchema, actualizarEdicionSchema } from "./schema";

function generarToken() {
  return randomBytes(18).toString("base64url");
}

export async function crearEdicionAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const values = formDataToObject(formData);
    const { user } = await requirePermiso("admin.ediciones.editar");
    const data = parseForm(crearEdicionSchema, formData);

    await withAuditContext(user.id, () => prisma.edicion.create({ data }));
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/ediciones");
  redirect("/admin/ediciones");
}

export async function actualizarEdicionAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const values = formDataToObject(formData);
    const { user } = await requirePermiso("admin.ediciones.editar");
    const data = parseForm(actualizarEdicionSchema, formData);

    await withAuditContext(user.id, () =>
      prisma.edicion.update({ where: { id }, data })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/ediciones");
  redirect("/admin/ediciones");
}

export async function toggleActivaAction(formData: FormData): Promise<void> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) return;

  const { user } = await requirePermiso("admin.ediciones.editar");
  const actual = await prisma.edicion.findUnique({ where: { id }, select: { activa: true } });
  if (!actual) return;

  await withAuditContext(user.id, () =>
    prisma.edicion.update({ where: { id }, data: { activa: !actual.activa } })
  );
  revalidatePath("/admin/ediciones");
}

export async function publicarFormularioAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requirePermiso("admin.ediciones.editar");
    const actual = await prisma.edicion.findUnique({
      where: { id },
      select: { formularioToken: true },
    });
    if (!actual) return { ok: false, error: "Edición no encontrada." };
    if (actual.formularioToken) {
      revalidatePath("/admin/ediciones");
      return { ok: true, data: undefined };
    }

    await withAuditContext(user.id, () =>
      prisma.edicion.update({
        where: { id },
        data: { formularioToken: generarToken() },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/ediciones");
  return { ok: true, data: undefined };
}

export async function rotarFormularioAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requirePermiso("admin.ediciones.editar");
    await withAuditContext(user.id, () =>
      prisma.edicion.update({
        where: { id },
        data: { formularioToken: generarToken() },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/ediciones");
  return { ok: true, data: undefined };
}

export async function despublicarFormularioAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requirePermiso("admin.ediciones.editar");
    await withAuditContext(user.id, () =>
      prisma.edicion.update({
        where: { id },
        data: { formularioToken: null },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/ediciones");
  return { ok: true, data: undefined };
}
