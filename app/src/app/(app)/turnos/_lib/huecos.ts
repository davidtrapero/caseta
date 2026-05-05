import "server-only";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Devuelve un Map<turnoId, huecosLibres> para voluntarios en una edición.
 * Hueco libre = TurnoPlaza(voluntario).cantidad
 *             - TurnoEmpleado(voluntario asignado)
 *             - SolicitudVoluntarioTurno(pendiente)
 *
 * Si opts.turnoIds se pasa, solo calcula para esos turnos (optimización).
 * Si opts.excluirSolicitudId se pasa, excluye esa solicitud del conteo de pendientes
 * (útil en aprobarSolicitudAction para que los huecos que reservaba sean los que consume).
 */
export async function calcularHuecosVoluntario(
  tx: Tx,
  edicionId: string,
  opts?: { turnoIds?: string[]; excluirSolicitudId?: string }
): Promise<Map<string, number>> {
  const filtroTurnos = opts?.turnoIds ? { id: { in: opts.turnoIds } } : {};

  const turnos = await tx.turno.findMany({
    where: { edicionId, ...filtroTurnos },
    select: {
      id: true,
      plazas: {
        where: { perfil: "voluntario" },
        select: { cantidad: true },
      },
      asignaciones: {
        where: { empleado: { perfil: "voluntario" } },
        select: { empleadoId: true },
      },
      solicitudesVoluntario: {
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

  const result = new Map<string, number>();
  for (const t of turnos) {
    const plazas = t.plazas[0]?.cantidad ?? 0;
    const asignados = t.asignaciones.length;
    const pendientes = t.solicitudesVoluntario.length;
    result.set(t.id, Math.max(0, plazas - asignados - pendientes));
  }
  return result;
}
