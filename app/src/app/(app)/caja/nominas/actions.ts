"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
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
    const { user } = await requireRole(["admin", "gerente"]);

    const edicion = await obtenerEdicionActiva();
    if (!edicion) return { ok: false, error: "No hay edición activa." };

    // ¿Hay nóminas pagadas en la edición?
    const hayPagadas = await prisma.nomina.count({
      where: { edicionId: edicion.id, pagada: true },
    });
    if (hayPagadas > 0 && user.rol !== "admin") {
      return {
        ok: false,
        error:
          "Hay nóminas ya pagadas en esta edición. Solo admin puede recalcular.",
      };
    }

    // Asignaciones con asistencia, agrupadas por empleado.
    const asistencias = await prisma.turnoEmpleado.groupBy({
      by: ["empleadoId"],
      where: {
        asistio: true,
        turno: { edicionId: edicion.id },
      },
      _count: { _all: true },
    });

    // Empleados implicados.
    const empleadoIds = asistencias.map((a) => a.empleadoId);
    const empleados = empleadoIds.length
      ? await prisma.empleado.findMany({
          where: { id: { in: empleadoIds } },
          select: { id: true, jornalDiario: true },
        })
      : [];
    const empleadoPorId = new Map(empleados.map((e) => [e.id, e]));

    // Nóminas existentes (para detectar pagadas y decidir create vs update).
    const existentes = await prisma.nomina.findMany({
      where: { edicionId: edicion.id },
      select: { id: true, empleadoId: true, pagada: true },
    });
    const nominaPorEmpleado = new Map(existentes.map((n) => [n.empleadoId, n]));

    let creadas = 0;
    let actualizadas = 0;
    let pagadasOmitidas = 0;
    let voluntariosOmitidos = 0;

    await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        for (const a of asistencias) {
          const empleado = empleadoPorId.get(a.empleadoId);
          if (!empleado) continue;

          // Voluntarios: excluidos.
          if (empleado.jornalDiario === null) {
            voluntariosOmitidos++;
            continue;
          }

          const existente = nominaPorEmpleado.get(a.empleadoId);
          if (existente?.pagada) {
            pagadasOmitidas++;
            continue;
          }

          const dias = a._count._all;
          const jornal = empleado.jornalDiario;
          const total = Number(jornal) * dias;

          if (existente) {
            await tx.nomina.update({
              where: { id: existente.id },
              data: {
                diasTrabajados: dias,
                jornalAplicado: jornal,
                total,
              },
            });
            actualizadas++;
          } else {
            await tx.nomina.create({
              data: {
                edicionId: edicion.id,
                empleadoId: a.empleadoId,
                diasTrabajados: dias,
                jornalAplicado: jornal,
                total,
              },
            });
            creadas++;
          }
        }
      })
    );

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

export async function marcarPagadaAction(formData: FormData): Promise<void> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) return;

  const { user } = await requireRole(["admin"]);

  const existente = await prisma.nomina.findUnique({
    where: { id },
    select: { pagada: true },
  });
  if (!existente || existente.pagada) return;

  await withAuditContext(user.id, () =>
    prisma.nomina.update({
      where: { id },
      data: { pagada: true, fechaPago: new Date() },
    })
  );

  revalidatePath("/caja/nominas");
}

export async function desmarcarPagadaAction(formData: FormData): Promise<void> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) return;

  // Solo admin — deshacer un "pagada" requiere intención explícita.
  const { user } = await requireRole(["admin"]);

  const existente = await prisma.nomina.findUnique({
    where: { id },
    select: { pagada: true },
  });
  if (!existente || !existente.pagada) return;

  await withAuditContext(user.id, () =>
    prisma.nomina.update({
      where: { id },
      data: { pagada: false, fechaPago: null },
    })
  );

  revalidatePath("/caja/nominas");
}
