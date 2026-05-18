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
import {
  crearTipoEmpleadoSchema,
  actualizarTipoEmpleadoSchema,
} from "./schema";

function revalidarTipos() {
  revalidatePath("/admin/tipos-empleado");
  revalidatePath("/empleados");
}

export async function crearTipoEmpleadoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const values = formDataToObject(formData);
  try {
    const { user } = await requirePermiso("admin.tipos-empleado.crud");
    const data = parseForm(crearTipoEmpleadoSchema, formData);

    const maxOrden = await prisma.tipoEmpleado.aggregate({
      _max: { orden: true },
    });
    const nuevoOrden = (maxOrden._max.orden ?? -10) + 10;

    await withAuditContext(user.id, () =>
      prisma.tipoEmpleado.create({
        data: {
          slug: data.slug,
          label: data.label,
          labelCorto: data.labelCorto,
          colorHex: data.colorHex,
          orden: nuevoOrden,
          esVoluntario: data.esVoluntario,
          activo: true,
        },
      })
    );
  } catch (err) {
    const base = toActionError(err);
    return base.ok ? base : { ...base, values };
  }

  revalidarTipos();
  redirect("/admin/tipos-empleado");
}

export async function actualizarTipoEmpleadoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  const values = formDataToObject(formData);
  try {
    const { user } = await requirePermiso("admin.tipos-empleado.crud");
    const data = parseForm(actualizarTipoEmpleadoSchema, formData);

    await withAuditContext(user.id, () =>
      prisma.tipoEmpleado.update({
        where: { id },
        data: {
          label: data.label,
          labelCorto: data.labelCorto,
          colorHex: data.colorHex,
          orden: data.orden,
          esVoluntario: data.esVoluntario,
          activo: data.activo,
        },
      })
    );
  } catch (err) {
    const base = toActionError(err);
    return base.ok ? base : { ...base, values };
  }

  revalidarTipos();
  redirect("/admin/tipos-empleado");
}

export async function eliminarTipoEmpleadoAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requirePermiso("admin.tipos-empleado.crud");

    const tipo = await prisma.tipoEmpleado.findUnique({
      where: { id },
      include: {
        _count: { select: { empleadoTipos: true, plazas: true } },
      },
    });

    if (!tipo) {
      return { ok: false, error: "La categoría de personal no existe." };
    }

    const enUso = tipo._count.empleadoTipos > 0 || tipo._count.plazas > 0;

    if (enUso) {
      await withAuditContext(user.id, () =>
        prisma.tipoEmpleado.update({
          where: { id },
          data: { activo: false },
        })
      );
      revalidarTipos();
      return {
        ok: false,
        error:
          "Esta categoría está en uso por el personal o las plazas y no se puede borrar. Se ha marcado como inactiva.",
      };
    }

    await withAuditContext(user.id, () =>
      prisma.tipoEmpleado.delete({ where: { id } })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidarTipos();
  redirect("/admin/tipos-empleado");
}
