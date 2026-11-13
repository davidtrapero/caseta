"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { toActionError, type ActionResult } from "@/lib/action-result";
import { obtenerEdicionActiva } from "@/lib/edicion";

export type ResultadoCalculo = {
  creadas: number;
  actualizadas: number;
  pagadasOmitidas: number;
  voluntariosOmitidos: number;
};

/**
 * Recalcula las nóminas de la edición activa.
 *
 * Regla:
 * - Para cada Empleado con jornalDiario != null (no voluntario):
 *   diasTrabajados = count(TurnoEmpleado con asistio=true en turnos de esta edición).
 *   total = diasTrabajados * jornalDiario.
 * - Upsert por (empleadoId, edicionId). Nóminas con pagada=true NO se tocan.
 * - Voluntarios (jornalDiario IS NULL): excluidos, ni se crean ni se actualizan.
 * - Si ya existe una nómina pagada para la edición, solo admin puede recalcular.
 */
export async function calcularNominasAction(): Promise<
  ActionResult<ResultadoCalculo>
> {
  try {
    const { user } = await requirePermiso("caja.nominas.crear");

    const edicion = await obtenerEdicionActiva();
    if (!edicion) return { ok: false, error: "No hay edición activa." };

    let creadas = 0;
    let actualizadas = 0;
    let pagadasOmitidas = 0;
    let voluntariosOmitidos = 0;

    // Lecturas y escrituras en la misma transacción: si alguien marca una nómina como pagada
    // entre medias, el update condicional (pagada: false) la deja intacta.
    const rechazo = await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        const hayPagadas = await tx.nomina.count({
          where: { edicionId: edicion.id, pagada: true },
        });
        if (hayPagadas > 0 && user.rol !== "admin") {
          return "Hay nóminas ya pagadas en esta edición. Solo admin puede recalcular.";
        }

        // Un día trabajado = una fecha UTC distinta con asistencia (DATE(fechaInicio)),
        // aunque el empleado tenga varios turnos ese día.
        const asistencias = await tx.turnoEmpleado.findMany({
          where: { asistio: true, turno: { edicionId: edicion.id } },
          select: { empleadoId: true, turno: { select: { fechaInicio: true } } },
        });
        const diasPorEmpleado = new Map<string, Set<string>>();
        for (const a of asistencias) {
          const dia = a.turno.fechaInicio.toISOString().slice(0, 10);
          const dias = diasPorEmpleado.get(a.empleadoId) ?? new Set<string>();
          dias.add(dia);
          diasPorEmpleado.set(a.empleadoId, dias);
        }

        const empleadoIds = [...diasPorEmpleado.keys()];
        const empleados = empleadoIds.length
          ? await tx.empleado.findMany({
              where: { id: { in: empleadoIds } },
              select: { id: true, jornalDiario: true },
            })
          : [];
        const empleadoPorId = new Map(empleados.map((e) => [e.id, e]));

        const existentes = await tx.nomina.findMany({
          where: { edicionId: edicion.id },
          select: { id: true, empleadoId: true, pagada: true },
        });
        const nominaPorEmpleado = new Map(existentes.map((n) => [n.empleadoId, n]));

        for (const [empleadoId, diasSet] of diasPorEmpleado) {
          const empleado = empleadoPorId.get(empleadoId);
          if (!empleado) continue;

          // Voluntarios: excluidos.
          if (empleado.jornalDiario === null) {
            voluntariosOmitidos++;
            continue;
          }

          const existente = nominaPorEmpleado.get(empleadoId);
          if (existente?.pagada) {
            pagadasOmitidas++;
            continue;
          }

          const dias = diasSet.size;
          const jornal = empleado.jornalDiario;
          const total = jornal.mul(dias);

          if (existente) {
            try {
              await tx.nomina.update({
                where: { id: existente.id, pagada: false },
                data: { diasTrabajados: dias, jornalAplicado: jornal, total },
              });
              actualizadas++;
            } catch (err) {
              // P2025: se pagó entre la lectura y la escritura.
              if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
                pagadasOmitidas++;
                continue;
              }
              throw err;
            }
          } else {
            await tx.nomina.create({
              data: {
                edicionId: edicion.id,
                empleadoId,
                diasTrabajados: dias,
                jornalAplicado: jornal,
                total,
              },
            });
            creadas++;
          }
        }
        return null;
      })
    );
    if (rechazo) return { ok: false, error: rechazo };

    revalidatePath("/caja/nominas");
    revalidatePath("/caja/balance");
    return {
      ok: true,
      data: { creadas, actualizadas, pagadasOmitidas, voluntariosOmitidos },
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function marcarPagadaAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requirePermiso("caja.nominas.marcar-pagada");

    const existente = await prisma.nomina.findUnique({
      where: { id },
      select: { pagada: true },
    });
    if (!existente) return { ok: false, error: "Nómina no encontrada." };
    if (existente.pagada) return { ok: true, data: undefined };

    await withAuditContext(user.id, () =>
      prisma.nomina.update({
        where: { id },
        data: { pagada: true, fechaPago: new Date() },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/caja/nominas");
  return { ok: true, data: undefined };
}

export async function desmarcarPagadaAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    // Solo admin — deshacer un "pagada" requiere intención explícita.
    const { user } = await requirePermiso("caja.nominas.marcar-pagada");

    const existente = await prisma.nomina.findUnique({
      where: { id },
      select: { pagada: true },
    });
    if (!existente) return { ok: false, error: "Nómina no encontrada." };
    if (!existente.pagada) return { ok: true, data: undefined };

    await withAuditContext(user.id, () =>
      prisma.nomina.update({
        where: { id },
        data: { pagada: false, fechaPago: null },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/caja/nominas");
  return { ok: true, data: undefined };
}
