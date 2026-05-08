"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { crearEmpleadoSchema, actualizarEmpleadoSchema } from "./schema";

// Valida la regla "voluntario ⇒ jornal NULL + entidad NOT NULL" según el
// flag esVoluntario del TipoEmpleado seleccionado.
async function validarReglaVoluntario(data: {
  tipoEmpleadoId: string;
  jornalDiario: number | undefined;
  entidadId: string | undefined;
  telefono: string | undefined;
  exigirContacto: boolean;
}): Promise<ActionResult<unknown> | null> {
  const tipo = await prisma.tipoEmpleado.findUnique({
    where: { id: data.tipoEmpleadoId },
    select: { esVoluntario: true, activo: true },
  });
  if (!tipo || !tipo.activo) {
    return { ok: false, error: "Tipo de empleado no válido o inactivo." };
  }

  if (tipo.esVoluntario) {
    if (data.jornalDiario !== undefined) {
      return {
        ok: false,
        error: "Los voluntarios no pueden tener jornal asignado.",
        fieldErrors: { jornalDiario: ["Dejar vacío para voluntarios."] },
      };
    }
    if (!data.entidadId) {
      return {
        ok: false,
        error: "Los voluntarios requieren una entidad.",
        fieldErrors: { entidadId: ["Entidad obligatoria para voluntarios."] },
      };
    }
    if (data.exigirContacto && !data.telefono) {
      return {
        ok: false,
        error: "Los voluntarios requieren teléfono.",
        fieldErrors: { telefono: ["Teléfono obligatorio para voluntarios."] },
      };
    }
  } else {
    if (data.jornalDiario === undefined) {
      return {
        ok: false,
        error: "El jornal diario es obligatorio para no-voluntarios.",
        fieldErrors: { jornalDiario: ["Indica un jornal."] },
      };
    }
  }
  return null;
}

export async function crearEmpleadoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(crearEmpleadoSchema, formData);

    const err = await validarReglaVoluntario({
      tipoEmpleadoId: data.tipoEmpleadoId,
      jornalDiario: data.jornalDiario,
      entidadId: data.entidadId,
      telefono: data.telefono,
      exigirContacto: true,
    });
    if (err) return err as ActionResult<{ id: string }>;

    await withAuditContext(user.id, () =>
      prisma.empleado.create({
        data: {
          nombre: data.nombre,
          dni: data.dni ?? null,
          telefono: data.telefono ?? null,
          jornalDiario: data.jornalDiario ?? null,
          entidadId: data.entidadId ?? null,
          tipoEmpleadoId: data.tipoEmpleadoId,
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

    // Al actualizar no exigimos teléfono — coherente con baseline previo.
    const err = await validarReglaVoluntario({
      tipoEmpleadoId: data.tipoEmpleadoId,
      jornalDiario: data.jornalDiario,
      entidadId: data.entidadId,
      telefono: data.telefono,
      exigirContacto: false,
    });
    if (err) return err as ActionResult<{ id: string }>;

    await withAuditContext(user.id, () =>
      prisma.empleado.update({
        where: { id },
        data: {
          nombre: data.nombre,
          dni: data.dni ?? null,
          telefono: data.telefono ?? null,
          jornalDiario: data.jornalDiario ?? null,
          entidadId: data.entidadId ?? null,
          tipoEmpleadoId: data.tipoEmpleadoId,
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

export async function toggleActivoEmpleadoAction(
  _prev: ActionResult<{ activo: boolean }> | null,
  formData: FormData
): Promise<ActionResult<{ activo: boolean }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const actual = await prisma.empleado.findUnique({
      where: { id },
      select: { activo: true },
    });
    if (!actual) {
      return { ok: false, error: "Empleado no encontrado." };
    }

    const actualizado = await withAuditContext(user.id, () =>
      prisma.empleado.update({ where: { id }, data: { activo: !actual.activo } })
    );

    revalidatePath("/admin/empleados");
    return { ok: true, data: { activo: actualizado.activo } };
  } catch (err) {
    return toActionError(err);
  }
}
