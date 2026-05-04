import { prisma } from "@/lib/prisma";
import type { SemanaTurnos, TurnoSerializable, CasetaMin, EmpleadoMin, EdicionMin } from "../types";
import { addDays, fromWeekCode, startOfWeek, toIsoDate } from "./fechas";

function toEdicionMin(e: {
  id: string;
  anio: number;
  nombre: string;
  activa: boolean;
  fechaInicio: Date;
  fechaFin: Date;
}): EdicionMin {
  return {
    id: e.id,
    anio: e.anio,
    nombre: e.nombre,
    activa: e.activa,
    fechaInicio: e.fechaInicio.toISOString(),
    fechaFin: e.fechaFin.toISOString(),
  };
}

export async function loadSemanaTurnos(params: {
  casetaId?: string;
  semana?: string; // YYYY-Www
}): Promise<SemanaTurnos | null> {
  const hoy = new Date();
  const hoyIso = toIsoDate(hoy);

  // 1. Edición activa (o más reciente si no hay activa).
  const ediciones = await prisma.edicion.findMany({
    orderBy: [{ activa: "desc" }, { anio: "desc" }],
  });
  if (ediciones.length === 0) return null;
  const edicionActiva = ediciones[0];

  // 2. Casetas.
  const casetas = await prisma.caseta.findMany({
    orderBy: [{ activa: "desc" }, { nombre: "asc" }],
  });
  if (casetas.length === 0) return null;

  const casetaSeleccionada =
    (params.casetaId && casetas.find((c) => c.id === params.casetaId)) || casetas[0];

  // 3. Semana.
  const lunesFromParam = params.semana ? fromWeekCode(params.semana) : null;
  const lunes = lunesFromParam ?? startOfWeek(hoy);
  const domingo = addDays(lunes, 6);
  const finExclusivo = addDays(lunes, 8); // incluimos inicio del lunes siguiente para turnos que cruzan medianoche del domingo

  // 4. Turnos: traer los que arrancan en la ventana [lunes, finExclusivo) en la caseta seleccionada.
  const turnosRaw = await prisma.turno.findMany({
    where: {
      casetaId: casetaSeleccionada.id,
      edicionId: edicionActiva.id,
      fechaInicio: {
        gte: lunes,
        lt: finExclusivo,
      },
    },
    include: {
      empleado: { select: { id: true, nombre: true } },
    },
    orderBy: { fechaInicio: "asc" },
  });

  const turnos: TurnoSerializable[] = turnosRaw.map((t) => ({
    id: t.id,
    edicionId: t.edicionId,
    casetaId: t.casetaId,
    empleadoId: t.empleadoId,
    empleadoNombre: t.empleado.nombre,
    fechaInicio: t.fechaInicio.toISOString(),
    fechaFin: t.fechaFin.toISOString(),
    asistio: t.asistio,
  }));

  // 5. Empleados activos.
  const empleadosRaw = await prisma.empleado.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, activo: true, jornalDiario: true },
  });
  const empleados: EmpleadoMin[] = empleadosRaw.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    activo: e.activo,
    esVoluntario: e.jornalDiario === null,
  }));

  const casetasMin: CasetaMin[] = casetas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    activa: c.activa,
  }));

  const readonly = !edicionActiva.activa || !casetaSeleccionada.activa;

  return {
    edicion: toEdicionMin(edicionActiva),
    edicionesDisponibles: ediciones.map(toEdicionMin),
    casetaSeleccionada: {
      id: casetaSeleccionada.id,
      nombre: casetaSeleccionada.nombre,
      activa: casetaSeleccionada.activa,
    },
    casetas: casetasMin,
    lunes: toIsoDate(lunes),
    domingo: toIsoDate(domingo),
    turnos,
    empleados,
    hoyIso,
    readonly,
  };
}
