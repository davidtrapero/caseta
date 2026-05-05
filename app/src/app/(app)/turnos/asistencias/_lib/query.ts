import "server-only";
import { prisma } from "@/lib/prisma";
import type { PerfilEmpleado } from "@prisma/client";

export type AsistenciasFiltros = {
  edicionId: string;
  perfiles?: PerfilEmpleado[];
  entidadId?: string;
  casetaId?: string;
};

export async function cargarAsistencias(filtros: AsistenciasFiltros) {
  const { edicionId, perfiles, entidadId, casetaId } = filtros;

  return prisma.empleado.findMany({
    where: {
      perfil: perfiles && perfiles.length > 0 ? { in: perfiles } : undefined,
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
