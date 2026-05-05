"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { crearEmpleadoSchema, actualizarEmpleadoSchema } from "./schema";

export async function crearEmpleadoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(crearEmpleadoSchema, formData);

    await withAuditContext(user.id, () =>
      prisma.empleado.create({
        data: {
          nombre: data.nombre,
          dni: data.dni ?? null,
          telefono: data.telefono ?? null,
          jornalDiario: data.jornalDiario ?? null,
          entidadId: data.entidadId ?? null,
          perfil: data.perfil as import("@prisma/client").PerfilEmpleado,
          activo: data.activo,
        },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/empleados");
  redirect("/admin/empleados");
}

export async function actualizarEmpleadoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(actualizarEmpleadoSchema, formData);

    await withAuditContext(user.id, () =>
      prisma.empleado.update({
        where: { id },
        data: {
          nombre: data.nombre,
          dni: data.dni ?? null,
          telefono: data.telefono ?? null,
          jornalDiario: data.jornalDiario ?? null,
          entidadId: data.entidadId ?? null,
          perfil: data.perfil as import("@prisma/client").PerfilEmpleado,
          activo: data.activo,
        },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/empleados");
  redirect("/admin/empleados");
}

export async function toggleActivoEmpleadoAction(formData: FormData): Promise<void> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) return;

  const { user } = await requireRole(["admin", "gerente"]);
  const actual = await prisma.empleado.findUnique({
    where: { id },
    select: { activo: true },
  });
  if (!actual) return;

  await withAuditContext(user.id, () =>
    prisma.empleado.update({ where: { id }, data: { activo: !actual.activo } })
  );
  revalidatePath("/admin/empleados");
}
