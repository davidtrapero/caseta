import "server-only";
import { prisma } from "@/lib/prisma";

type Tx = Parameters<Parameters<(typeof prisma)["$transaction"]>[0]>[0];

/**
 * Devuelve un Map<turnoId, huecosLibres> para empleados contratados en una edición.
 * Hueco libre = TurnoPlaza(contratado).cantidad
 *             - TurnoEmpleado(contratado asignado)
 *             - SolicitudEmpleadoTurno(pendiente)
 *
 * Si opts.turnoIds se pasa, solo calcula para esos turnos (optimización).
 * Si opts.excluirSolicitudId se pasa, excluye esa solicitud del conteo de pendientes
 * (útil en aprobarSolicitudAction para que los huecos que reservaba sean los que consume).
 */
export async function calcularHuecosEmpleado(
  tx: Tx,
  edicionId: string,
  opts?: { turnoIds?: string[]; excluirSolicitudId?: string }
): Promise<Map<string, number>> {
  const filtroTurnos = opts?.turnoIds ? { id: { in: opts.turnoIds } } : {};

  // Resolver el (los) tipo(s) marcados como esVoluntario=false (empleados contratados).
  // En la práctica, solo hay uno, pero soportamos N por seguridad.
  const tiposEmpleado = await tx.tipoEmpleado.findMany({
    where: { esVoluntario: false },
    select: { id: true },
  });
  const tipoEmpleadoIds = tiposEmpleado.map((t) => t.id);

  if (tipoEmpleadoIds.length === 0) {
    return new Map();
  }

  // Try to include solicitudesEmpleado, but fall back if table doesn't exist
  let turnosWithSolicitudes: Array<{
    id: string;
    plazas: Array<{ cantidad: number }>;
    asignaciones: Array<{ empleadoId: string }>;
    solicitudesEmpleado?: Array<{ solicitudId: string }>;
  }>;

  try {
    turnosWithSolicitudes = await tx.turno.findMany({
      where: { edicionId, ...filtroTurnos },
      select: {
        id: true,
        plazas: {
          where: { tipoEmpleadoId: { in: tipoEmpleadoIds } },
          select: { cantidad: true },
        },
        asignaciones: {
          where: { tipoImputadoId: { in: tipoEmpleadoIds } },
          select: { empleadoId: true },
        },
        solicitudesEmpleado: {
          where: {
            solicitud: {
              estado: "pendiente",
              ...(opts?.excluirSolicitudId
                ? { id: { not: opts.excluirSolicitudId } }
                : {}),
            },
          },
          select: { solicitudId: true },
        },
      },
    });
  } catch (err) {
    // Si la tabla SolicitudEmpleadoTurno no existe, query sin ella
    turnosWithSolicitudes = await tx.turno.findMany({
      where: { edicionId, ...filtroTurnos },
      select: {
        id: true,
        plazas: {
          where: { tipoEmpleadoId: { in: tipoEmpleadoIds } },
          select: { cantidad: true },
        },
        asignaciones: {
          where: { tipoImputadoId: { in: tipoEmpleadoIds } },
          select: { empleadoId: true },
        },
      },
    });
  }

  const result = new Map<string, number>();
  for (const t of turnosWithSolicitudes) {
    const plazas = t.plazas.reduce((acc, p) => acc + p.cantidad, 0);
    const asignados = t.asignaciones.length;
    const pendientes = t.solicitudesEmpleado?.length ?? 0;
    result.set(t.id, Math.max(0, plazas - asignados - pendientes));
  }
  return result;
}
