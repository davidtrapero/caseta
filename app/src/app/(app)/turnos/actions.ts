"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { detectarSolape, type TurnoRango } from "@/lib/turnos-solape";
import { obtenerEdicionActiva } from "@/lib/edicion";
import {
  crearTurnoSchema,
  actualizarTurnoSchema,
  actualizarPlazasSchema,
  actualizarTurnoYPlazasSchema,
  asignarEmpleadoSchema,
  desasignarEmpleadoSchema,
  toggleAsistenciaSchema,
  duplicarDiaSchema,
  duplicarSemanaSchema,
  rellenarPlazasTurnosSinPlazasSchema,
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

    const plazasFiltradas = data.plazasJson.filter((p) => p.cantidad > 0);

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
        if (plazasFiltradas.length > 0) {
          await tx.turnoPlaza.createMany({
            data: plazasFiltradas.map((p) => ({
              turnoId: t.id,
              tipoEmpleadoId: p.tipoEmpleadoId,
              cantidad: p.cantidad,
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

// ---------- desasignar empleado desde la página del empleado ----------
//
// Misma lógica que `desasignarEmpleadoAction` pero revalidando además
// `/empleados/[id]`. Mantiene el original intacto para no acoplar las dos
// vistas (turnos vs empleado).

export async function desasignarTurnoDesdeEmpleadoAction(
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
    revalidatePath(`/empleados/${data.empleadoId}`);
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
    if (data.casetaIdOrigen && data.casetaIdOrigen !== data.casetaId) {
      const casOrigErr = await validarCasetaActiva(data.casetaIdOrigen);
      if (casOrigErr) return { ok: false, error: casOrigErr };
    }

    const origenIni = ymdToUtcDate(data.diaOrigen);
    const origenFin = new Date(origenIni.getTime() + 24 * 60 * 60 * 1000);
    const destinoIni = ymdToUtcDate(data.diaDestino);
    const desplazamientoMs = destinoIni.getTime() - origenIni.getTime();

    const origenes = await prisma.turno.findMany({
      where: {
        casetaId: data.casetaIdOrigen ?? data.casetaId,
        edicionId: data.edicionId,
        fechaInicio: { gte: origenIni, lt: origenFin },
      },
      include: {
        asignaciones: { select: { empleadoId: true } },
        plazas: { select: { tipoEmpleadoId: true, cantidad: true } },
      },
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
      copiarAsignaciones: data.copiarAsignaciones,
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
    if (data.casetaIdOrigen && data.casetaIdOrigen !== data.casetaId) {
      const casOrigErr = await validarCasetaActiva(data.casetaIdOrigen);
      if (casOrigErr) return { ok: false, error: casOrigErr };
    }

    const origenIni = ymdToUtcDate(data.lunesOrigen);
    const origenFin = new Date(origenIni.getTime() + 7 * 24 * 60 * 60 * 1000);
    const destinoIni = ymdToUtcDate(data.lunesDestino);
    const desplazamientoMs = destinoIni.getTime() - origenIni.getTime();

    const origenes = await prisma.turno.findMany({
      where: {
        casetaId: data.casetaIdOrigen ?? data.casetaId,
        edicionId: data.edicionId,
        fechaInicio: { gte: origenIni, lt: origenFin },
      },
      include: {
        asignaciones: { select: { empleadoId: true } },
        plazas: { select: { tipoEmpleadoId: true, cantidad: true } },
      },
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
      copiarAsignaciones: data.copiarAsignaciones,
    });
    if ("error" in resultado) return { ok: false, error: resultado.error };

    revalidatePath("/turnos");
    return { ok: true, data: { copiados: resultado.copiados } };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- actualizar plazas esperadas ----------

/**
 * Valida que las nuevas plazas cubran al menos los empleados ya asignados de
 * cada tipo. Devuelve null si todo OK, o un mensaje de error si alguna plaza
 * queda por debajo del número de asignados de ese tipo en el turno.
 */
async function validarPlazasVsAsignados(
  turnoId: string,
  plazasNuevas: { tipoEmpleadoId: string; cantidad: number }[]
): Promise<string | null> {
  const asignaciones = await prisma.turnoEmpleado.findMany({
    where: { turnoId },
    include: {
      empleado: {
        select: {
          tipoEmpleadoId: true,
          tipoEmpleado: { select: { label: true } },
        },
      },
    },
  });
  if (asignaciones.length === 0) return null;

  const asignadosPorTipo = new Map<string, { count: number; label: string }>();
  for (const a of asignaciones) {
    const prev = asignadosPorTipo.get(a.empleado.tipoEmpleadoId);
    asignadosPorTipo.set(a.empleado.tipoEmpleadoId, {
      count: (prev?.count ?? 0) + 1,
      label: a.empleado.tipoEmpleado.label,
    });
  }

  const cantidadPorTipo = new Map(
    plazasNuevas.map((p) => [p.tipoEmpleadoId, p.cantidad])
  );

  for (const [tipoId, { count, label }] of asignadosPorTipo) {
    const nueva = cantidadPorTipo.get(tipoId) ?? 0;
    if (nueva < count) {
      return `No puedes reducir las plazas de ${label} por debajo de ${count} (ya tienes ${count} asignado${count === 1 ? "" : "s"}).`;
    }
  }
  return null;
}

/**
 * Aplica el diff de plazas dentro de una transacción ya abierta. No hace
 * validaciones: se asume que el caller ya las hizo (existencia del turno,
 * plazas vs asignados, etc).
 */
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function aplicarPlazasEnTx(
  tx: Tx,
  turnoId: string,
  plazas: { tipoEmpleadoId: string; cantidad: number }[]
) {
  const tiposActivos = plazas
    .filter((p) => p.cantidad > 0)
    .map((p) => p.tipoEmpleadoId);
  await tx.turnoPlaza.deleteMany({
    where: {
      turnoId,
      tipoEmpleadoId: tiposActivos.length > 0 ? { notIn: tiposActivos } : undefined,
    },
  });
  for (const p of plazas.filter((p) => p.cantidad > 0)) {
    await tx.turnoPlaza.upsert({
      where: {
        turnoId_tipoEmpleadoId: { turnoId, tipoEmpleadoId: p.tipoEmpleadoId },
      },
      update: { cantidad: p.cantidad },
      create: {
        turnoId,
        tipoEmpleadoId: p.tipoEmpleadoId,
        cantidad: p.cantidad,
      },
    });
  }
}

export async function actualizarPlazasAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData
): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(actualizarPlazasSchema, formData);

    const turno = await prisma.turno.findUnique({
      where: { id: data.turnoId },
      select: { id: true },
    });
    if (!turno) return { ok: false, error: "Turno no encontrado." };

    const plazas = data.plazasJson;

    const errPlazas = await validarPlazasVsAsignados(data.turnoId, plazas);
    if (errPlazas) return { ok: false, error: errPlazas };

    await withAuditContext(user.id, () =>
      prisma.$transaction((tx) => aplicarPlazasEnTx(tx, data.turnoId, plazas))
    );

    revalidatePath("/turnos");
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------- actualizar turno + plazas (Fase 4 evolutivo C) ----------

export async function actualizarTurnoYPlazasAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(actualizarTurnoYPlazasSchema, formData);

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

    // Solape contra el nuevo horario, excluyendo este turno.
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

    const errPlazas = await validarPlazasVsAsignados(id, data.plazasJson);
    if (errPlazas) return { ok: false, error: errPlazas };

    await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        await tx.turno.update({
          where: { id },
          data: {
            edicionId: data.edicionId,
            casetaId: data.casetaId,
            fechaInicio: inicio,
            fechaFin: fin,
          },
        });
        await aplicarPlazasEnTx(tx, id, data.plazasJson);
      })
    );

    revalidatePath("/turnos");
    return { ok: true, data: { id } };
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
  plazas: { tipoEmpleadoId: string; cantidad: number }[];
};

async function validarYCopiarTurnos(args: {
  origenes: TurnoConAsignaciones[];
  desplazamientoMs: number;
  casetaId: string;
  edicionId: string;
  userId: string;
  copiarAsignaciones: boolean;
}): Promise<{ copiados: number } | { error: string }> {
  const {
    origenes,
    desplazamientoMs,
    casetaId,
    edicionId,
    userId,
    copiarAsignaciones,
  } = args;

  // Empleados involucrados (sólo si vamos a copiar asignaciones).
  const empleadoIds = copiarAsignaciones
    ? Array.from(
        new Set(origenes.flatMap((t) => t.asignaciones.map((a) => a.empleadoId)))
      )
    : [];

  // Plan: lista de turnos nuevos (fechas desplazadas). Las plazas se copian
  // siempre; los empleados sólo si copiarAsignaciones=true.
  const plan = origenes.map((t) => ({
    fechaInicio: new Date(t.fechaInicio.getTime() + desplazamientoMs),
    fechaFin: new Date(t.fechaFin.getTime() + desplazamientoMs),
    empleadoIds: copiarAsignaciones
      ? t.asignaciones.map((a) => a.empleadoId)
      : [],
    plazas: t.plazas.filter((p) => p.cantidad > 0),
  }));

  if (copiarAsignaciones && empleadoIds.length > 0) {
    // Validar: empleados activos.
    const empErr = await validarEmpleadosActivos(empleadoIds);
    if (empErr) return { error: empErr };

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
        if (p.plazas.length > 0) {
          await tx.turnoPlaza.createMany({
            data: p.plazas.map((pl) => ({
              turnoId: nuevo.id,
              tipoEmpleadoId: pl.tipoEmpleadoId,
              cantidad: pl.cantidad,
            })),
          });
        }
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

// ---------- mantenimiento: rellenar plazas en turnos huérfanos ----------

type ContadorTurnosSinPlazas = {
  total: number;
  porCaseta: { casetaId: string; casetaNombre: string; total: number }[];
};

export async function contarTurnosSinPlazasAction(): Promise<
  ActionResult<ContadorTurnosSinPlazas>
> {
  try {
    await requireRole(["admin"]);

    const ed = await obtenerEdicionActiva();
    if (!ed) {
      return { ok: true, data: { total: 0, porCaseta: [] } };
    }

    const turnos = await prisma.turno.findMany({
      where: { edicionId: ed.id, plazas: { none: {} } },
      select: {
        casetaId: true,
        caseta: { select: { nombre: true } },
      },
    });

    const acc = new Map<string, { casetaId: string; casetaNombre: string; total: number }>();
    for (const t of turnos) {
      const prev = acc.get(t.casetaId);
      if (prev) {
        prev.total += 1;
      } else {
        acc.set(t.casetaId, {
          casetaId: t.casetaId,
          casetaNombre: t.caseta.nombre,
          total: 1,
        });
      }
    }

    const porCaseta = Array.from(acc.values()).sort((a, b) =>
      a.casetaNombre.localeCompare(b.casetaNombre, "es")
    );

    return { ok: true, data: { total: turnos.length, porCaseta } };
  } catch (err) {
    return toActionError(err);
  }
}

export async function rellenarPlazasTurnosSinPlazasAction(
  _prev: ActionResult<{ rellenados: number }> | null,
  formData: FormData
): Promise<ActionResult<{ rellenados: number }>> {
  try {
    const { user } = await requireRole(["admin"]);
    const data = parseForm(rellenarPlazasTurnosSinPlazasSchema, formData);

    const ed = await obtenerEdicionActiva();
    if (!ed) return { ok: false, error: "No hay edición activa." };

    const tipoIds = data.plazasJson.map((p) => p.tipoEmpleadoId);
    const tiposUnicos = new Set(tipoIds);
    if (tiposUnicos.size !== tipoIds.length) {
      return { ok: false, error: "No puedes repetir el mismo tipo de empleado." };
    }

    const tipos = await prisma.tipoEmpleado.findMany({
      where: { id: { in: tipoIds } },
      select: { id: true, activo: true },
    });
    if (tipos.length !== tipoIds.length) {
      return { ok: false, error: "Algún tipo de empleado no existe." };
    }
    if (tipos.some((t) => !t.activo)) {
      return { ok: false, error: "Algún tipo de empleado no está activo." };
    }

    if (data.casetaId) {
      const casErr = await validarCasetaActiva(data.casetaId);
      if (casErr) return { ok: false, error: casErr };
    }

    const turnos = await prisma.turno.findMany({
      where: {
        edicionId: ed.id,
        plazas: { none: {} },
        ...(data.casetaId ? { casetaId: data.casetaId } : {}),
      },
      select: { id: true },
    });

    if (turnos.length === 0) {
      return { ok: true, data: { rellenados: 0 } };
    }

    await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        for (const t of turnos) {
          await tx.turnoPlaza.createMany({
            data: data.plazasJson.map((p) => ({
              turnoId: t.id,
              tipoEmpleadoId: p.tipoEmpleadoId,
              cantidad: p.cantidad,
            })),
          });
        }
      })
    );

    revalidatePath("/turnos");
    revalidatePath("/admin/mantenimiento");
    return { ok: true, data: { rellenados: turnos.length } };
  } catch (err) {
    return toActionError(err);
  }
}
