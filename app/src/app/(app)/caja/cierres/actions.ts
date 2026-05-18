"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { formDataToObject } from "@/lib/forms";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { crearCierreSchema, actualizarCierreSchema } from "./schema";

function ymdToUtcDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export async function crearCierreAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const values = formDataToObject(formData);
    const { user } = await requireRole(["admin", "gerente", "cajero"]);
    const data = parseForm(crearCierreSchema, formData);

    const edicion = await obtenerEdicionActiva();
    if (!edicion) return { ok: false, error: "No hay edición activa.", values };

    const caseta = await prisma.caseta.findUnique({
      where: { id: data.casetaId },
      select: { activa: true },
    });
    if (!caseta) return { ok: false, error: "Caseta no encontrada.", values };
    if (!caseta.activa) return { ok: false, error: "La caseta no está activa.", values };

    await withAuditContext(user.id, () =>
      prisma.cierreDiario.create({
        data: {
          edicionId: edicion.id,
          casetaId: data.casetaId,
          fecha: ymdToUtcDate(data.fecha),
          ingresosTotales: data.ingresosTotales,
          notas: data.notas ?? null,
        },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/caja/cierres");
  revalidatePath("/caja/balance");
  redirect("/caja/cierres");
}

export async function actualizarCierreAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const values = formDataToObject(formData);
    const { user } = await requireRole(["admin", "gerente", "cajero"]);
    const data = parseForm(actualizarCierreSchema, formData);

    const existente = await prisma.cierreDiario.findUnique({ where: { id } });
    if (!existente) return { ok: false, error: "Cierre no encontrado.", values };

    // Si está bloqueado, solo admin puede editar.
    if (existente.bloqueado && user.rol !== "admin") {
      return {
        ok: false,
        error: "El cierre está bloqueado. Solo admin puede editarlo.",
        values,
      };
    }

    await withAuditContext(user.id, () =>
      prisma.cierreDiario.update({
        where: { id },
        data: {
          casetaId: data.casetaId,
          fecha: ymdToUtcDate(data.fecha),
          ingresosTotales: data.ingresosTotales,
          notas: data.notas ?? null,
        },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/caja/cierres");
  revalidatePath("/caja/balance");
  redirect("/caja/cierres");
}

export async function bloquearCierreAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);

    const existente = await prisma.cierreDiario.findUnique({
      where: { id },
      select: { bloqueado: true },
    });
    if (!existente) return { ok: false, error: "Cierre no encontrado." };

    await withAuditContext(user.id, () =>
      prisma.cierreDiario.update({
        where: { id },
        data: { bloqueado: true },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/caja/cierres");
  return { ok: true, data: undefined };
}

export async function desbloquearCierreAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    // Solo admin puede desbloquear.
    const { user } = await requireRole(["admin"]);

    const existente = await prisma.cierreDiario.findUnique({
      where: { id },
      select: { bloqueado: true },
    });
    if (!existente) return { ok: false, error: "Cierre no encontrado." };

    await withAuditContext(user.id, () =>
      prisma.cierreDiario.update({
        where: { id },
        data: { bloqueado: false },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/caja/cierres");
  return { ok: true, data: undefined };
}

export async function eliminarCierreAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    // Solo admin puede borrar.
    const { user } = await requireRole(["admin"]);

    const existente = await prisma.cierreDiario.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existente) return { ok: false, error: "Cierre no encontrado." };

    await withAuditContext(user.id, () =>
      prisma.cierreDiario.delete({ where: { id } })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/caja/cierres");
  revalidatePath("/caja/balance");
  return { ok: true, data: undefined };
}
