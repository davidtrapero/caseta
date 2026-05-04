"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { crearCasetaSchema, actualizarCasetaSchema } from "./schema";

export async function crearCasetaAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(crearCasetaSchema, formData);

    await withAuditContext(user.id, () => prisma.caseta.create({ data }));
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/casetas");
  redirect("/admin/casetas");
}

export async function actualizarCasetaAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(actualizarCasetaSchema, formData);

    await withAuditContext(user.id, () =>
      prisma.caseta.update({ where: { id }, data })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/casetas");
  redirect("/admin/casetas");
}

/**
 * Toggle de `activa`. Al desactivar, bloquea si hay turnos futuros o cierre de hoy.
 * Firma compatible con useActionState para poder mostrar el error en UI.
 */
export async function toggleActivaCasetaAction(
  _prev: ActionResult<{ activa: boolean }> | null,
  formData: FormData
): Promise<ActionResult<{ activa: boolean }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const actual = await prisma.caseta.findUnique({
      where: { id },
      select: { activa: true },
    });
    if (!actual) {
      return { ok: false, error: "Caseta no encontrada." };
    }

    // Si se va a desactivar, comprobar bloqueos.
    if (actual.activa) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const [turnosFuturos, cierreHoy] = await Promise.all([
        prisma.turno.count({
          where: { casetaId: id, fecha: { gte: hoy } },
        }),
        prisma.cierreDiario.count({
          where: { casetaId: id, fecha: hoy },
        }),
      ]);

      if (turnosFuturos > 0) {
        return {
          ok: false,
          error: `No se puede desactivar: hay ${turnosFuturos} turno(s) programado(s) a partir de hoy.`,
        };
      }
      if (cierreHoy > 0) {
        return {
          ok: false,
          error: "No se puede desactivar: ya existe un cierre diario con fecha de hoy.",
        };
      }
    }

    const actualizada = await withAuditContext(user.id, () =>
      prisma.caseta.update({
        where: { id },
        data: { activa: !actual.activa },
      })
    );

    revalidatePath("/admin/casetas");
    return { ok: true, data: { activa: actualizada.activa } };
  } catch (err) {
    return toActionError(err);
  }
}
