"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { obtenerEdicionActiva } from "../_lib/edicion-activa";
import { crearGastoSchema, actualizarGastoSchema } from "./schema";

function ymdToUtcDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export async function crearGastoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente", "cajero"]);
    const data = parseForm(crearGastoSchema, formData);

    const edicion = await obtenerEdicionActiva();
    if (!edicion) return { ok: false, error: "No hay edición activa." };

    if (data.casetaId) {
      const caseta = await prisma.caseta.findUnique({
        where: { id: data.casetaId },
        select: { activa: true },
      });
      if (!caseta) return { ok: false, error: "Caseta no encontrada." };
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
    return toActionError(err);
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

  try {
    const { user } = await requireRole(["admin", "gerente", "cajero"]);
    const data = parseForm(actualizarGastoSchema, formData);

    const existente = await prisma.gasto.findUnique({ where: { id } });
    if (!existente) return { ok: false, error: "Gasto no encontrado." };

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
    return toActionError(err);
  }

  revalidatePath("/caja/gastos");
  revalidatePath("/caja/balance");
  redirect("/caja/gastos");
}

export async function eliminarGastoAction(
  formData: FormData
): Promise<void> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) return;

  const { user } = await requireRole(["admin"]);

  const existente = await prisma.gasto.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existente) return;

  await withAuditContext(user.id, () =>
    prisma.gasto.delete({ where: { id } })
  );

  revalidatePath("/caja/gastos");
  revalidatePath("/caja/balance");
}
