import "server-only";
import { prisma } from "@/lib/prisma";

export type AsistenciasFiltros = {
  edicionId: string;
  tipoEmpleadoIds?: string[];
  entidadId?: string;
  casetaId?: string;
};

export async function cargarAsistencias(filtros: AsistenciasFiltros) {
  const { edicionId, tipoEmpleadoIds, entidadId, casetaId } = filtros;

  return prisma.empleado.findMany({
    where: {
      tipoEmpleadoId:
        tipoEmpleadoIds && tipoEmpleadoIds.length > 0
          ? { in: tipoEmpleadoIds }
          : undefined,
      entidadId: entidadId || undefined,
      asignaciones: {
        some: {
          asistio: true,
          turno: {
            edicionId,
            casetaId: casetaId || undefined,
          },
        },
      },
    },
    include: {
      tipoEmpleado: true,
      entidad: { select: { nombre: true } },
      asignaciones: {
        where: {
          asistio: true,
          turno: {
            edicionId,
            casetaId: casetaId || undefined,
          },
        },
        include: { turno: { include: { caseta: true } } },
        orderBy: { turno: { fechaInicio: "asc" } },
      },
    },
    orderBy: { nombre: "asc" },
  });
}

export type EmpleadoConAsistencias = Awaited<ReturnType<typeof cargarAsistencias>>[number];
