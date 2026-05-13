import "server-only";
import { prisma } from "@/lib/prisma";

type Tx = Parameters<Parameters<(typeof prisma)["$transaction"]>[0]>[0];

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

  // Resolver el (los) tipo(s) marcados como esVoluntario. Asumimos que en la
  // práctica solo hay uno (slug='voluntario'), pero soportamos N por seguridad.
  const tiposVoluntario = await tx.tipoEmpleado.findMany({
    where: { esVoluntario: true },
    select: { id: true },
  });
  const tipoVoluntarioIds = tiposVoluntario.map((t) => t.id);

  if (tipoVoluntarioIds.length === 0) {
    // Sin tipo voluntario configurado, no hay huecos posibles.
    return new Map();
  }

  const turnos = await tx.turno.findMany({
    where: { edicionId, ...filtroTurnos },
    select: {
      id: true,
      plazas: {
        where: { tipoEmpleadoId: { in: tipoVoluntarioIds } },
        select: { cantidad: true },
      },
      asignaciones: {
        where: { empleado: { tipoEmpleadoId: { in: tipoVoluntarioIds } } },
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
    const plazas = t.plazas.reduce((acc, p) => acc + p.cantidad, 0);
    const asignados = t.asignaciones.length;
    const pendientes = t.solicitudesVoluntario.length;
    result.set(t.id, Math.max(0, plazas - asignados - pendientes));
  }
  return result;
}
