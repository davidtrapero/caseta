"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { detectarSolape, type TurnoRango } from "@/lib/turnos-solape";
import {
  crearTurnoSchema,
  actualizarTurnoSchema,
  asignarEmpleadoSchema,
  desasignarEmpleadoSchema,
  toggleAsistenciaSchema,
  duplicarDiaSchema,
  duplicarSemanaSchema,
} from "./schema";

// ---------- helpers ----------

/**
 * Carga turnos (via TurnoEmpleado) de los empleados dados cuya fechaInicio cae
 * en [inicio, fin). Devuelve una lista plana de TurnoRango consumible por
 * detectarSolape. Nota: un turno con N empleados produce N filas aquí.
 */
async function cargarTurnosEmpleadoEnVentana(
  empleadoIds: string[],
  inicio: Date,
  fin: Date
): Promise<TurnoRango[]> {
  if (empleadoIds.length === 0) return [];
  const asignaciones = await prisma.turnoEmpleado.findMany({
    where: {
      empleadoId: { in: empleadoIds },
      turno: { fechaInicio: { gte: inicio, lt: fin } },
    },
    include: { turno: true },
  });
  return asignaciones.map((a) => ({
    id: a.turno.id,
    empleadoId: a.empleadoId,
    casetaId: a.turno.casetaId,
    fechaInicio: a.turno.fechaInicio,
    fechaFin: a.turno.fechaFin,
  }));
}

/**
 * Ventana ±1 día para capturar turnos cross-midnight adyacentes al nuevo rango.
 */
function ventanaAmpliada(inicio: Date, fin: Date): { gte: Date; lt: Date } {
  const gte = new Date(inicio.getTime() - 24 * 60 * 60 * 1000);
  const lt = new Date(fin.getTime() + 24 * 60 * 60 * 1000);
  return { gte, lt };
}

async function validarEdicionActiva(edicionId: string) {
  const ed = await prisma.edicion.findUnique({
    where: { id: edicionId },
    select: { activa: true },
  });
  if (!ed) return "Edición no encontrada.";
  if (!ed.activa) return "La edición no está activa.";
  return null;
}

async function validarCasetaActiva(casetaId: string) {
  const c = await prisma.caseta.findUnique({
    where: { id: casetaId },
    select: { activa: true },
  });
  if (!c) return "Caseta no encontrada.";
  if (!c.activa) return "La caseta no está activa.";
  return null;
}

async function validarEmpleadosActivos(ids: string[]) {
  if (ids.length === 0) return null;
  const empleados = await prisma.empleado.findMany({
    where: { id: { in: ids } },
    select: { id: true, activo: true },
  });
  if (empleados.length !== ids.length) return "Algún empleado no existe.";
  const inactivo = empleados.find((e) => !e.activo);
  if (inactivo) return "Algún empleado no está activo.";
  return null;
}

function ymdToUtcDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

// ---------- crear turno ----------

export async function crearTurnoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(crearTurnoSchema, formData);

    // Duplicados en la lista de empleados.
    const uniq = new Set(data.empleadoIdsJson);
    if (uniq.size !== data.empleadoIdsJson.length) {
      return { ok: false, error: "Un empleado aparece duplicado en la lista." };
    }

    const edErr = await validarEdicionActiva(data.edicionId);
    if (edErr) return { ok: false, error: edErr };
    const casErr = await validarCasetaActiva(data.casetaId);
    if (casErr) return { ok: false, error: casErr };
    const empErr = await validarEmpleadosActivos(data.empleadoIdsJson);
    if (empErr) return { ok: false, error: empErr };

    const inicio = new Date(data.fechaInicio);
    const fin = new Date(data.fechaFin);

    // Solape: cargar turnos de estos empleados en ventana ±1 día.
    if (data.empleadoIdsJson.length > 0) {
      const { gte, lt } = ventanaAmpliada(inicio, fin);
      const existentes = await cargarTurnosEmpleadoEnVentana(
        data.empleadoIdsJson,
        gte,
        lt
      );
      for (const empleadoId of data.empleadoIdsJson) {
        const res = detectarSolape(existentes, {
          empleadoId,
          fechaInicio: inicio,
          fechaFin: fin,
        });
        if (res.solapa) {
          return {
            ok: false,
            error: `Solape detectado para un empleado (${res.conflictos.length} conflicto(s)).`,
          };
        }
      }
    }

    const turno = await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        const t = await tx.turno.create({
          data: {
            edicionId: data.edicionId,
            casetaId: data.casetaId,
            fechaInicio: inicio,
            fechaFin: fin,
          },
        });
        if (data.empleadoIdsJson.length > 0) {
          await tx.turnoEmpleado.createMany({
            data: data.empleadoIdsJson.map((empleadoId) => ({
              turnoId: t.id,
              empleadoId,
            })),
          });
        }
        return t;
      })
    );

    revalidatePath("/turnos");
    return { ok: true, data: { id: turno.id } };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- actualizar turno (sólo horario) ----------

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

    const edErr = await validarEdicionActiva(data.edicionId);
    if (edErr) return { ok: false, error: edErr };
    const casErr = await validarCasetaActiva(data.casetaId);
    if (casErr) return { ok: false, error: casErr };

    const existente = await prisma.turno.findUnique({
      where: { id },
      include: { asignaciones: { select: { empleadoId: true } } },
    });
    if (!existente) return { ok: false, error: "Turno no encontrado." };

    const inicio = new Date(data.fechaInicio);
    const fin = new Date(data.fechaFin);
    const empleadoIds = existente.asignaciones.map((a) => a.empleadoId);

    if (empleadoIds.length > 0) {
      const { gte, lt } = ventanaAmpliada(inicio, fin);
      const existentes = await cargarTurnosEmpleadoEnVentana(empleadoIds, gte, lt);
      for (const empleadoId of empleadoIds) {
        const res = detectarSolape(
          existentes,
          { empleadoId, fechaInicio: inicio, fechaFin: fin },
          { excluirTurnoId: id }
        );
        if (res.solapa) {
          return {
            ok: false,
            error: `Solape detectado tras mover el horario (${res.conflictos.length} conflicto(s)).`,
          };
        }
      }
    }

    await withAuditContext(user.id, () =>
      prisma.turno.update({
        where: { id },
        data: {
          edicionId: data.edicionId,
          casetaId: data.casetaId,
          fechaInicio: inicio,
          fechaFin: fin,
        },
      })
    );

    revalidatePath("/turnos");
    return { ok: true, data: { id } };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- eliminar turno ----------

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

    const existente = await prisma.turno.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existente) return { ok: false, error: "Turno no encontrado." };

    await withAuditContext(user.id, () =>
      prisma.turno.delete({ where: { id } })
    );

    revalidatePath("/turnos");
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- asignar empleado ----------

export async function asignarEmpleadoAction(
  _prev: ActionResult<{ turnoId: string; empleadoId: string }> | null,
  formData: FormData
): Promise<ActionResult<{ turnoId: string; empleadoId: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(asignarEmpleadoSchema, formData);

    const turno = await prisma.turno.findUnique({
      where: { id: data.turnoId },
      include: { asignaciones: { select: { empleadoId: true } } },
    });
    if (!turno) return { ok: false, error: "Turno no encontrado." };

    if (turno.asignaciones.some((a) => a.empleadoId === data.empleadoId)) {
      return { ok: false, error: "El empleado ya está asignado a este turno." };
    }

    const empErr = await validarEmpleadosActivos([data.empleadoId]);
    if (empErr) return { ok: false, error: empErr };

    const { gte, lt } = ventanaAmpliada(turno.fechaInicio, turno.fechaFin);
    const existentes = await cargarTurnosEmpleadoEnVentana(
      [data.empleadoId],
      gte,
      lt
    );
    const res = detectarSolape(
      existentes,
      {
        empleadoId: data.empleadoId,
        fechaInicio: turno.fechaInicio,
        fechaFin: turno.fechaFin,
      },
      { excluirTurnoId: turno.id }
    );
    if (res.solapa) {
      return {
        ok: false,
        error: "Solape con otro turno del empleado.",
      };
    }

    await withAuditContext(user.id, () =>
      prisma.turnoEmpleado.create({
        data: { turnoId: data.turnoId, empleadoId: data.empleadoId },
      })
    );

    revalidatePath("/turnos");
    return {
      ok: true,
      data: { turnoId: data.turnoId, empleadoId: data.empleadoId },
    };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- desasignar empleado ----------

export async function desasignarEmpleadoAction(
  _prev: ActionResult<{ turnoId: string; empleadoId: string }> | null,
  formData: FormData
): Promise<ActionResult<{ turnoId: string; empleadoId: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(desasignarEmpleadoSchema, formData);

    const fila = await prisma.turnoEmpleado.findUnique({
      where: {
        turnoId_empleadoId: {
          turnoId: data.turnoId,
          empleadoId: data.empleadoId,
        },
      },
    });
    if (!fila) {
      return { ok: false, error: "Asignación no encontrada." };
    }

    await withAuditContext(user.id, () =>
      prisma.turnoEmpleado.delete({ where: { id: fila.id } })
    );

    revalidatePath("/turnos");
    return {
      ok: true,
      data: { turnoId: data.turnoId, empleadoId: data.empleadoId },
    };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- toggle asistencia ----------

export async function toggleAsistenciaAction(
  _prev: ActionResult<{ asistio: boolean }> | null,
  formData: FormData
): Promise<ActionResult<{ asistio: boolean }>> {
  try {
    const { user } = await requireRole(["admin", "gerente", "cajero"]);
    const data = parseForm(toggleAsistenciaSchema, formData);

    const fila = await prisma.turnoEmpleado.findUnique({
      where: {
        turnoId_empleadoId: {
          turnoId: data.turnoId,
          empleadoId: data.empleadoId,
        },
      },
      include: { turno: { select: { fechaInicio: true } } },
    });
    if (!fila) return { ok: false, error: "Asignación no encontrada." };

    // DATE(turno.fechaInicio) <= hoy
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);
    const diaTurno = new Date(fila.turno.fechaInicio);
    diaTurno.setUTCHours(0, 0, 0, 0);
    if (diaTurno.getTime() > hoy.getTime()) {
      return {
        ok: false,
        error: "No se puede marcar asistencia en turnos futuros.",
      };
    }

    // Cajero sólo en turnos pasados (no hoy ni futuros).
    if (user.rol === "cajero" && diaTurno.getTime() >= hoy.getTime()) {
      return {
        ok: false,
        error: "Sólo puedes marcar asistencia de turnos pasados.",
      };
    }

    const actualizada = await withAuditContext(user.id, () =>
      prisma.turnoEmpleado.update({
        where: { id: fila.id },
        data: { asistio: data.asistio },
      })
    );

    revalidatePath("/turnos");
    return { ok: true, data: { asistio: actualizada.asistio } };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- duplicar día ----------

export async function duplicarDiaAction(
  _prev: ActionResult<{ copiados: number }> | null,
  formData: FormData
): Promise<ActionResult<{ copiados: number }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(duplicarDiaSchema, formData);

    const edErr = await validarEdicionActiva(data.edicionId);
    if (edErr) return { ok: false, error: edErr };
    const casErr = await validarCasetaActiva(data.casetaId);
    if (casErr) return { ok: false, error: casErr };

    const origenIni = ymdToUtcDate(data.diaOrigen);
    const origenFin = new Date(origenIni.getTime() + 24 * 60 * 60 * 1000);
    const destinoIni = ymdToUtcDate(data.diaDestino);
    const desplazamientoMs = destinoIni.getTime() - origenIni.getTime();

    const origenes = await prisma.turno.findMany({
      where: {
        casetaId: data.casetaId,
        edicionId: data.edicionId,
        fechaInicio: { gte: origenIni, lt: origenFin },
      },
      include: { asignaciones: { select: { empleadoId: true } } },
      orderBy: { fechaInicio: "asc" },
    });

    if (origenes.length === 0) {
      return { ok: true, data: { copiados: 0 } };
    }

    const resultado = await validarYCopiarTurnos({
      origenes,
      desplazamientoMs,
      casetaId: data.casetaId,
      edicionId: data.edicionId,
      userId: user.id,
    });
    if ("error" in resultado) return { ok: false, error: resultado.error };

    revalidatePath("/turnos");
    return { ok: true, data: { copiados: resultado.copiados } };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- duplicar semana ----------

export async function duplicarSemanaAction(
  _prev: ActionResult<{ copiados: number }> | null,
  formData: FormData
): Promise<ActionResult<{ copiados: number }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(duplicarSemanaSchema, formData);

    const edErr = await validarEdicionActiva(data.edicionId);
    if (edErr) return { ok: false, error: edErr };
    const casErr = await validarCasetaActiva(data.casetaId);
    if (casErr) return { ok: false, error: casErr };

    const origenIni = ymdToUtcDate(data.lunesOrigen);
    const origenFin = new Date(origenIni.getTime() + 7 * 24 * 60 * 60 * 1000);
    const destinoIni = ymdToUtcDate(data.lunesDestino);
    const desplazamientoMs = destinoIni.getTime() - origenIni.getTime();

    const origenes = await prisma.turno.findMany({
      where: {
        casetaId: data.casetaId,
        edicionId: data.edicionId,
        fechaInicio: { gte: origenIni, lt: origenFin },
      },
      include: { asignaciones: { select: { empleadoId: true } } },
      orderBy: { fechaInicio: "asc" },
    });

    if (origenes.length === 0) {
      return { ok: true, data: { copiados: 0 } };
    }

    const resultado = await validarYCopiarTurnos({
      origenes,
      desplazamientoMs,
      casetaId: data.casetaId,
      edicionId: data.edicionId,
      userId: user.id,
    });
    if ("error" in resultado) return { ok: false, error: resultado.error };

    revalidatePath("/turnos");
    return { ok: true, data: { copiados: resultado.copiados } };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- helper compartido duplicar ----------

type TurnoConAsignaciones = {
  id: string;
  casetaId: string;
  edicionId: string;
  fechaInicio: Date;
  fechaFin: Date;
  asignaciones: { empleadoId: string }[];
};

async function validarYCopiarTurnos(args: {
  origenes: TurnoConAsignaciones[];
  desplazamientoMs: number;
  casetaId: string;
  edicionId: string;
  userId: string;
}): Promise<{ copiados: number } | { error: string }> {
  const { origenes, desplazamientoMs, casetaId, edicionId, userId } = args;

  // Empleados involucrados en destino + ventana temporal.
  const empleadoIds = Array.from(
    new Set(origenes.flatMap((t) => t.asignaciones.map((a) => a.empleadoId)))
  );

  // Plan: lista de turnos nuevos (fechas desplazadas).
  const plan = origenes.map((t) => ({
    fechaInicio: new Date(t.fechaInicio.getTime() + desplazamientoMs),
    fechaFin: new Date(t.fechaFin.getTime() + desplazamientoMs),
    empleadoIds: t.asignaciones.map((a) => a.empleadoId),
  }));

  // Validar: empleados activos.
  const empErr = await validarEmpleadosActivos(empleadoIds);
  if (empErr) return { error: empErr };

  if (empleadoIds.length > 0) {
    const minInicio = plan.reduce(
      (m, p) => (p.fechaInicio < m ? p.fechaInicio : m),
      plan[0].fechaInicio
    );
    const maxFin = plan.reduce(
      (m, p) => (p.fechaFin > m ? p.fechaFin : m),
      plan[0].fechaFin
    );
    const { gte, lt } = ventanaAmpliada(minInicio, maxFin);
    const baseExistentes = await cargarTurnosEmpleadoEnVentana(
      empleadoIds,
      gte,
      lt
    );

    // Solape acumulado: cada nuevo turno añade también sus asignaciones a la
    // lista para detectar solapes entre los propios duplicados.
    const acumulado: TurnoRango[] = [...baseExistentes];
    for (const [idx, p] of plan.entries()) {
      for (const empleadoId of p.empleadoIds) {
        const res = detectarSolape(acumulado, {
          empleadoId,
          fechaInicio: p.fechaInicio,
          fechaFin: p.fechaFin,
        });
        if (res.solapa) {
          return {
            error: "Solape al duplicar: algún empleado ya tiene turno en el destino.",
          };
        }
      }
      for (const empleadoId of p.empleadoIds) {
        acumulado.push({
          id: `__plan_${idx}`,
          empleadoId,
          casetaId,
          fechaInicio: p.fechaInicio,
          fechaFin: p.fechaFin,
        });
      }
    }
  }

  await withAuditContext(userId, () =>
    prisma.$transaction(async (tx) => {
      for (const p of plan) {
        const nuevo = await tx.turno.create({
          data: {
            edicionId,
            casetaId,
            fechaInicio: p.fechaInicio,
            fechaFin: p.fechaFin,
          },
        });
        if (p.empleadoIds.length > 0) {
          await tx.turnoEmpleado.createMany({
            data: p.empleadoIds.map((empleadoId) => ({
              turnoId: nuevo.id,
              empleadoId,
              asistio: false,
            })),
          });
        }
      }
    })
  );

  return { copiados: plan.length };
}
