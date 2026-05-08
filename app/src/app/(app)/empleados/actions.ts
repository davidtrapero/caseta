"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { dniNieSchema } from "@/lib/validators";
import { crearEmpleadoSchema, actualizarEmpleadoSchema } from "./schema";

// Valida formato DNI sólo si no-voluntario. Para voluntarios devolvemos
// null (se ignora el valor, aunque el form haya llegado con texto residual).
function resolverDni(
  dniRaw: string | undefined,
  esVoluntario: boolean
): { ok: true; valor: string | null } | { ok: false; error: string } {
  if (esVoluntario) return { ok: true, valor: null };
  if (!dniRaw) return { ok: true, valor: null };
  const parsed = dniNieSchema.safeParse(dniRaw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "DNI/NIE inválido" };
  }
  return { ok: true, valor: parsed.data };
}

// Valida la regla "voluntario ⇒ jornal NULL + entidad NOT NULL" según el
// flag esVoluntario del TipoEmpleado seleccionado.
async function validarReglaVoluntario(data: {
  tipoEmpleadoId: string;
  jornalDiario: number | undefined;
  entidadId: string | undefined;
  telefono: string | undefined;
  exigirContacto: boolean;
}): Promise<{ esVoluntario: boolean } | ActionResult<unknown>> {
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
  return { esVoluntario: tipo.esVoluntario };
}

function esActionResult(
  v: { esVoluntario: boolean } | ActionResult<unknown>
): v is ActionResult<unknown> {
  return "ok" in v;
}

export async function crearEmpleadoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(crearEmpleadoSchema, formData);

    const reglaRes = await validarReglaVoluntario({
      tipoEmpleadoId: data.tipoEmpleadoId,
      jornalDiario: data.jornalDiario,
      entidadId: data.entidadId,
      telefono: data.telefono,
      exigirContacto: true,
    });
    if (esActionResult(reglaRes)) return reglaRes as ActionResult<{ id: string }>;

    const dniRes = resolverDni(data.dni, reglaRes.esVoluntario);
    if (!dniRes.ok) {
      return {
        ok: false,
        error: dniRes.error,
        fieldErrors: { dni: [dniRes.error] },
      };
    }

    await withAuditContext(user.id, () =>
      prisma.empleado.create({
        data: {
          nombre: data.nombre,
          dni: dniRes.valor,
          email: data.email ?? null,
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

  revalidatePath("/empleados");
  redirect("/empleados");
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
    const reglaRes = await validarReglaVoluntario({
      tipoEmpleadoId: data.tipoEmpleadoId,
      jornalDiario: data.jornalDiario,
      entidadId: data.entidadId,
      telefono: data.telefono,
      exigirContacto: false,
    });
    if (esActionResult(reglaRes)) return reglaRes as ActionResult<{ id: string }>;

    const dniRes = resolverDni(data.dni, reglaRes.esVoluntario);
    if (!dniRes.ok) {
      return {
        ok: false,
        error: dniRes.error,
        fieldErrors: { dni: [dniRes.error] },
      };
    }

    await withAuditContext(user.id, () =>
      prisma.empleado.update({
        where: { id },
        data: {
          nombre: data.nombre,
          dni: dniRes.valor,
          email: data.email ?? null,
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

  revalidatePath("/empleados");
  redirect("/empleados");
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

    revalidatePath("/empleados");
    return { ok: true, data: { activo: actualizado.activo } };
  } catch (err) {
    return toActionError(err);
  }
}
