"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { crearEntidadSchema, renombrarEntidadSchema } from "./schema";

export async function crearEntidadAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(crearEntidadSchema, formData);

    const creada = await withAuditContext(user.id, () =>
      prisma.entidadVoluntario.create({
        data: { nombre: data.nombre },
      })
    );

    revalidatePath("/admin/entidades");
    return { ok: true, data: { id: creada.id } };
  } catch (err) {
    return toActionError(err);
  }
}

export async function renombrarEntidadAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(renombrarEntidadSchema, formData);

    await withAuditContext(user.id, () =>
      prisma.entidadVoluntario.update({
        where: { id },
        data: { nombre: data.nombre },
      })
    );

    revalidatePath("/admin/entidades");
    return { ok: true, data: { id } };
  } catch (err) {
    return toActionError(err);
  }
}

export async function desactivarEntidadAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    await withAuditContext(user.id, () =>
      prisma.entidadVoluntario.update({
        where: { id },
        data: { activa: false },
      })
    );
    revalidatePath("/admin/entidades");
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err);
  }
}

export async function reactivarEntidadAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    await withAuditContext(user.id, () =>
      prisma.entidadVoluntario.update({
        where: { id },
        data: { activa: true },
      })
    );
    revalidatePath("/admin/entidades");
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err);
  }
}
