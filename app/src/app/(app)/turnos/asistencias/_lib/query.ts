import "server-only";
import { prisma } from "@/lib/prisma";

export type AsistenciasFiltros = {
  edicionId: string;
  tipoEmpleadoIds?: string[];
  entidadId?: string;
  casetaId?: string;
  skip?: number;
  take?: number;
};

export async function cargarAsistencias(filtros: AsistenciasFiltros) {
  const { edicionId, tipoEmpleadoIds, entidadId, casetaId, skip, take } =
    filtros;

  const where = {
    ...(tipoEmpleadoIds && tipoEmpleadoIds.length > 0
      ? { tipos: { some: { tipoEmpleadoId: { in: tipoEmpleadoIds } } } }
      : {}),
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
  };

  const [empleados, total] = await Promise.all([
    prisma.empleado.findMany({
      where,
      include: {
        tipos: { include: { tipoEmpleado: true } },
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
      skip: skip ?? 0,
      take: take ?? undefined,
    }),
    prisma.empleado.count({ where }),
  ]);

  return { empleados, total };
}

export type EmpleadoConAsistencias = Awaited<
  ReturnType<typeof cargarAsistencias>
>["empleados"][number];
