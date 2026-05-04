"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { detectarSolape } from "@/lib/turnos-solape";
import {
  crearTurnoSchema,
  actualizarTurnoSchema,
  toggleAsistenciaSchema,
  duplicarSemanaSchema,
} from "./schema";

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

function parseYmdUtc(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
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

    // Cargar turnos del empleado en ventana ±1 día para comparar solape.
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

// ---------- toggle asistencia ----------

export async function toggleAsistenciaAction(
  _prev: ActionResult<{ asistio: boolean }> | null,
  formData: FormData
): Promise<ActionResult<{ asistio: boolean }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(toggleAsistenciaSchema, formData);

    const turno = await prisma.turno.findUnique({
      where: { id: data.turnoId },
      select: { fechaInicio: true },
    });
    if (!turno) {
      return { ok: false, error: "Turno no encontrado." };
    }

    const inicioDia = new Date(turno.fechaInicio);
    inicioDia.setHours(0, 0, 0, 0);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (inicioDia.getTime() > hoy.getTime()) {
      return {
        ok: false,
        error: "No se puede marcar asistencia de un turno futuro.",
      };
    }

    const actualizado = await withAuditContext(user.id, () =>
      prisma.turno.update({
        where: { id: data.turnoId },
        data: { asistio: data.asistio },
      })
    );

    revalidatePath("/turnos");
    return { ok: true, data: { asistio: actualizado.asistio } };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- duplicar semana ----------

/**
 * Duplica todos los turnos de (casetaId, semana origen) a la semana destino.
 * Si hay alguna colisión por solape en la semana destino → aborta con error sin tocar BD.
 * `asistio` siempre arranca en false en los turnos copiados.
 */
export async function duplicarSemanaAction(
  _prev: ActionResult<{ copiados: number }> | null,
  formData: FormData
): Promise<ActionResult<{ copiados: number }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(duplicarSemanaSchema, formData);

    const [edicion, caseta] = await Promise.all([
      prisma.edicion.findUnique({ where: { id: data.edicionId }, select: { activa: true } }),
      prisma.caseta.findUnique({ where: { id: data.casetaId }, select: { activa: true } }),
    ]);
    if (!edicion) return { ok: false, error: "Edición no encontrada." };
    if (!edicion.activa) return { ok: false, error: "La edición no está activa." };
    if (!caseta) return { ok: false, error: "Caseta no encontrada." };
    if (!caseta.activa) return { ok: false, error: "La caseta está desactivada." };

    const lunesOrigen = parseYmdUtc(data.lunesOrigen);
    const lunesDestino = parseYmdUtc(data.lunesDestino);
    const finOrigen = new Date(lunesOrigen.getTime() + 7 * 24 * 60 * 60 * 1000);
    const finDestino = new Date(lunesDestino.getTime() + 7 * 24 * 60 * 60 * 1000);
    const offsetMs = lunesDestino.getTime() - lunesOrigen.getTime();

    // Turnos origen de esta caseta cuyo fechaInicio cae en la semana origen.
    const turnosOrigen = await prisma.turno.findMany({
      where: {
        casetaId: data.casetaId,
        edicionId: data.edicionId,
        fechaInicio: { gte: lunesOrigen, lt: finOrigen },
      },
      select: { empleadoId: true, fechaInicio: true, fechaFin: true },
    });

    if (turnosOrigen.length === 0) {
      return { ok: false, error: "No hay turnos en la semana origen para duplicar." };
    }

    const empleadoIds = [...new Set(turnosOrigen.map((t) => t.empleadoId))];
    const empleados = await prisma.empleado.findMany({
      where: { id: { in: empleadoIds } },
      select: { id: true, nombre: true, activo: true },
    });
    const inactivos = empleados.filter((e) => !e.activo);
    if (inactivos.length > 0) {
      return {
        ok: false,
        error: `No se puede duplicar: empleado(s) desactivado(s): ${inactivos
          .map((e) => e.nombre)
          .join(", ")}.`,
      };
    }

    // Turnos existentes de estos empleados en la semana destino (cualquier caseta),
    // con margen ±1 día por turnos cross-midnight.
    const ventanaInicio = new Date(lunesDestino.getTime() - 24 * 60 * 60 * 1000);
    const ventanaFin = new Date(finDestino.getTime() + 24 * 60 * 60 * 1000);
    const existentesDestino = await prisma.turno.findMany({
      where: {
        empleadoId: { in: empleadoIds },
        fechaInicio: { gte: ventanaInicio, lt: ventanaFin },
      },
      select: { id: true, empleadoId: true, casetaId: true, fechaInicio: true, fechaFin: true },
    });

    const nuevos = turnosOrigen.map((t) => ({
      edicionId: data.edicionId,
      casetaId: data.casetaId,
      empleadoId: t.empleadoId,
      fechaInicio: new Date(t.fechaInicio.getTime() + offsetMs),
      fechaFin: new Date(t.fechaFin.getTime() + offsetMs),
      asistio: false,
    }));

    // Validar solape contra BD + contra los propios nuevos ya aceptados.
    const acumulado: Array<{
      id: string;
      empleadoId: string;
      casetaId: string;
      fechaInicio: Date;
      fechaFin: Date;
    }> = [...existentesDestino];
    const conflictos: Array<{ empleadoId: string; fechaInicio: string }> = [];

    for (let i = 0; i < nuevos.length; i++) {
      const n = nuevos[i];
      const solape = detectarSolape(acumulado, {
        empleadoId: n.empleadoId,
        fechaInicio: n.fechaInicio,
        fechaFin: n.fechaFin,
      });
      if (solape.solapa) {
        conflictos.push({
          empleadoId: n.empleadoId,
          fechaInicio: n.fechaInicio.toISOString(),
        });
      }
      acumulado.push({
        id: `__nuevo_${i}`,
        empleadoId: n.empleadoId,
        casetaId: n.casetaId,
        fechaInicio: n.fechaInicio,
        fechaFin: n.fechaFin,
      });
    }

    if (conflictos.length > 0) {
      return {
        ok: false,
        error: `No se puede duplicar: ${conflictos.length} turno(s) producirían solape en la semana destino.`,
      };
    }

    // $transaction con creates individuales para que la extensión de AuditLog loguee cada uno.
    await withAuditContext(user.id, () =>
      prisma.$transaction(nuevos.map((n) => prisma.turno.create({ data: n })))
    );

    revalidatePath("/turnos");
    return { ok: true, data: { copiados: nuevos.length } };
  } catch (err) {
    return toActionError(err);
  }
}
