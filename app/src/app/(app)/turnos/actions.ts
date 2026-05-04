"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { detectarSolape } from "@/lib/turnos-solape";
import { crearTurnoSchema, actualizarTurnoSchema } from "./schema";

// ---------- helpers ----------

type EntidadesActivasCheck = {
  edicionId: string;
  casetaId: string;
  empleadoId: string;
};

async function validarEntidadesActivas({
  edicionId,
  casetaId,
  empleadoId,
}: EntidadesActivasCheck): Promise<string | null> {
  const [edicion, caseta, empleado] = await Promise.all([
    prisma.edicion.findUnique({ where: { id: edicionId }, select: { activa: true } }),
    prisma.caseta.findUnique({ where: { id: casetaId }, select: { activa: true } }),
    prisma.empleado.findUnique({ where: { id: empleadoId }, select: { activo: true } }),
  ]);

  if (!edicion) return "Edición no encontrada.";
  if (!edicion.activa) return "La edición no está activa.";
  if (!caseta) return "Caseta no encontrada.";
  if (!caseta.activa) return "La caseta está desactivada.";
  if (!empleado) return "Empleado no encontrado.";
  if (!empleado.activo) return "El empleado está desactivado.";
  return null;
}

// ---------- crear ----------

export async function crearTurnoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(crearTurnoSchema, formData);

    const err = await validarEntidadesActivas(data);
    if (err) return { ok: false, error: err };

    const fechaInicio = new Date(data.fechaInicio);
    const fechaFin = new Date(data.fechaFin);

    const ventanaInicio = new Date(fechaInicio.getTime() - 24 * 60 * 60 * 1000);
    const ventanaFin = new Date(fechaFin.getTime() + 24 * 60 * 60 * 1000);
    const existentes = await prisma.turno.findMany({
      where: {
        empleadoId: data.empleadoId,
        fechaInicio: { gte: ventanaInicio, lt: ventanaFin },
      },
      select: { id: true, empleadoId: true, casetaId: true, fechaInicio: true, fechaFin: true },
    });

    const solape = detectarSolape(existentes, {
      empleadoId: data.empleadoId,
      fechaInicio,
      fechaFin,
    });
    if (solape.solapa) {
      return {
        ok: false,
        error: `Solape con ${solape.conflictos.length} turno(s) existentes del mismo empleado.`,
      };
    }

    const creado = await withAuditContext(user.id, () =>
      prisma.turno.create({
        data: {
          edicionId: data.edicionId,
          casetaId: data.casetaId,
          empleadoId: data.empleadoId,
          fechaInicio,
          fechaFin,
        },
      })
    );

    revalidatePath("/turnos");
    return { ok: true, data: { id: creado.id } };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- actualizar ----------

export async function actualizarTurnoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(actualizarTurnoSchema, formData);

    const err = await validarEntidadesActivas(data);
    if (err) return { ok: false, error: err };

    const fechaInicio = new Date(data.fechaInicio);
    const fechaFin = new Date(data.fechaFin);

    const ventanaInicio = new Date(fechaInicio.getTime() - 24 * 60 * 60 * 1000);
    const ventanaFin = new Date(fechaFin.getTime() + 24 * 60 * 60 * 1000);
    const existentes = await prisma.turno.findMany({
      where: {
        empleadoId: data.empleadoId,
        fechaInicio: { gte: ventanaInicio, lt: ventanaFin },
      },
      select: { id: true, empleadoId: true, casetaId: true, fechaInicio: true, fechaFin: true },
    });

    const solape = detectarSolape(
      existentes,
      { empleadoId: data.empleadoId, fechaInicio, fechaFin },
      { excluirTurnoId: id }
    );
    if (solape.solapa) {
      return {
        ok: false,
        error: `Solape con ${solape.conflictos.length} turno(s) existentes del mismo empleado.`,
      };
    }

    const actualizado = await withAuditContext(user.id, () =>
      prisma.turno.update({
        where: { id },
        data: {
          edicionId: data.edicionId,
          casetaId: data.casetaId,
          empleadoId: data.empleadoId,
          fechaInicio,
          fechaFin,
        },
      })
    );

    revalidatePath("/turnos");
    return { ok: true, data: { id: actualizado.id } };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- eliminar ----------

export async function eliminarTurnoAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData
): Promise<ActionResult<undefined>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    await withAuditContext(user.id, () => prisma.turno.delete({ where: { id } }));
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/turnos");
  return { ok: true, data: undefined };
}

// ---------- toggle asistencia (stub) ----------

export async function toggleAsistenciaAction(
  _prev: ActionResult<{ asistio: boolean }> | null,
  _formData: FormData
): Promise<ActionResult<{ asistio: boolean }>> {
  throw new Error("toggleAsistenciaAction: not implemented");
}

/**
 * Duplica todos los turnos de (casetaId, semana origen) a la semana destino.
 * Si hay alguna colisión por solape en la semana destino → aborta con error sin tocar BD.
 * `asistio` siempre arranca en false en los turnos copiados.
 */
export async function duplicarSemanaAction(
  _prev: ActionResult<{ copiados: number }> | null,
  _formData: FormData
): Promise<ActionResult<{ copiados: number }>> {
  throw new Error("duplicarSemanaAction: not implemented");
}
