"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { formDataToObject } from "@/lib/forms";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { crearGastoSchema, actualizarGastoSchema } from "./schema";

function ymdToUtcDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export async function crearGastoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const values = formDataToObject(formData);
  try {
    const { user } = await requirePermiso("caja.gastos.crear");
    const data = parseForm(crearGastoSchema, formData);

    const edicion = await obtenerEdicionActiva();
    if (!edicion) return { ok: false, error: "No hay edición activa.", values };

    if (data.casetaId) {
      const caseta = await prisma.caseta.findUnique({
        where: { id: data.casetaId },
        select: { activa: true },
      });
      if (!caseta) return { ok: false, error: "Caseta no encontrada.", values };
    }

    await withAuditContext(user.id, () =>
      prisma.gasto.create({
        data: {
          edicionId: edicion.id,
          casetaId: data.casetaId ?? null,
          descripcion: data.descripcion,
          monto: data.monto,
          categoria: data.categoria,
          fecha: ymdToUtcDate(data.fecha),
          usuarioId: user.id,
        },
      })
    );
  } catch (err) {
    const base = toActionError(err);
    return base.ok ? base : { ...base, values };
  }

  revalidatePath("/caja/gastos");
  revalidatePath("/caja/balance");
  redirect("/caja/gastos");
}

export async function actualizarGastoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  const values = formDataToObject(formData);
  try {
    const { user } = await requirePermiso("caja.gastos.crear");
    const data = parseForm(actualizarGastoSchema, formData);

    const existente = await prisma.gasto.findUnique({ where: { id } });
    if (!existente) return { ok: false, error: "Gasto no encontrado.", values };

    await withAuditContext(user.id, () =>
      prisma.gasto.update({
        where: { id },
        data: {
          casetaId: data.casetaId ?? null,
          descripcion: data.descripcion,
          monto: data.monto,
          categoria: data.categoria,
          fecha: ymdToUtcDate(data.fecha),
        },
      })
    );
  } catch (err) {
    const base = toActionError(err);
    return base.ok ? base : { ...base, values };
  }

  revalidatePath("/caja/gastos");
  revalidatePath("/caja/balance");
  redirect("/caja/gastos");
}

export async function eliminarGastoAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requirePermiso("caja.gastos.eliminar");

    const existente = await prisma.gasto.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existente) return { ok: false, error: "Gasto no encontrado." };

    await withAuditContext(user.id, () =>
      prisma.gasto.delete({ where: { id } })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/caja/gastos");
  revalidatePath("/caja/balance");
  return { ok: true, data: undefined };
}
