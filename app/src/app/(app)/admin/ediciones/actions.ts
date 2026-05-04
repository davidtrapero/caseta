"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { crearEdicionSchema, actualizarEdicionSchema } from "./schema";

export async function crearEdicionAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin"]);
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
    const { user } = await requireRole(["admin"]);
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

  const { user } = await requireRole(["admin"]);
  const actual = await prisma.edicion.findUnique({ where: { id }, select: { activa: true } });
  if (!actual) return;

  await withAuditContext(user.id, () =>
    prisma.edicion.update({ where: { id }, data: { activa: !actual.activa } })
  );
  revalidatePath("/admin/ediciones");
}
