import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  DiaTurnos,
  SemanaTurnos,
  TurnoSerializable,
  AsignacionSerializable,
  ResumenDiaSemana,
  CasetaMin,
  EmpleadoMin,
  EdicionMin,
} from "../types";
import { addDays, fromYmd, hoyIso, lunesDe, toYmd } from "./fechas";

// Multi-caseta: necesitamos una edición activa para filtrar. Si no hay
// edición activa, devolvemos datos vacíos con una primera edición disponible.

function startOfDayLocal(ymd: string): Date {
  const d = fromYmd(ymd);
  d.setHours(0, 0, 0, 0);
  return d;
}

function edicionMin(e: {
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

function casetaMin(c: { id: string; nombre: string; activa: boolean }): CasetaMin {
  return { id: c.id, nombre: c.nombre, activa: c.activa };
}

function empleadoMin(e: {
  id: string;
  nombre: string;
  activo: boolean;
  jornalDiario: { toString(): string } | null;
}): EmpleadoMin {
  return {
    id: e.id,
    nombre: e.nombre,
    activo: e.activo,
    esVoluntario: e.jornalDiario === null,
  };
}

type TurnoRaw = {
  id: string;
  edicionId: string;
  casetaId: string;
  fechaInicio: Date;
  fechaFin: Date;
  asignaciones: {
    empleadoId: string;
    asistio: boolean;
    empleado: { nombre: string; jornalDiario: { toString(): string } | null };
  }[];
};

function turnoSerializable(t: TurnoRaw): TurnoSerializable {
  const asignaciones: AsignacionSerializable[] = t.asignaciones.map((a) => ({
    empleadoId: a.empleadoId,
    empleadoNombre: a.empleado.nombre,
    esVoluntario: a.empleado.jornalDiario === null,
    asistio: a.asistio,
  }));
  return {
    id: t.id,
    edicionId: t.edicionId,
    casetaId: t.casetaId,
    fechaInicio: t.fechaInicio.toISOString(),
    fechaFin: t.fechaFin.toISOString(),
    asignaciones,
  };
}

async function loadContexto(params: {
  casetaId?: string;
  edicionId?: string;
}): Promise<{
  edicion: EdicionMin;
  edicionesDisponibles: EdicionMin[];
  casetaSeleccionada: CasetaMin;
  casetas: CasetaMin[];
  empleados: EmpleadoMin[];
} | null> {
  const [ediciones, casetas, empleados] = await Promise.all([
    prisma.edicion.findMany({ orderBy: [{ activa: "desc" }, { anio: "desc" }] }),
    prisma.caseta.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.empleado.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  if (ediciones.length === 0 || casetas.length === 0) return null;

  const edicion =
    (params.edicionId && ediciones.find((e) => e.id === params.edicionId)) ||
    ediciones.find((e) => e.activa) ||
    ediciones[0];

  const casetaSeleccionada =
    (params.casetaId && casetas.find((c) => c.id === params.casetaId)) ||
    casetas[0];

  return {
    edicion: edicionMin(edicion),
    edicionesDisponibles: ediciones.map(edicionMin),
    casetaSeleccionada: casetaMin(casetaSeleccionada),
    casetas: casetas.map(casetaMin),
    empleados: empleados.map(empleadoMin),
  };
}

export async function loadDiaTurnos(params: {
  fecha?: string;
  casetaId?: string;
  edicionId?: string;
  readonly?: boolean;
}): Promise<DiaTurnos | null> {
  const fecha = params.fecha ?? hoyIso();
  const ctx = await loadContexto(params);
  if (!ctx) return null;

  const inicioDia = startOfDayLocal(fecha);
  const finDia = new Date(inicioDia);
  finDia.setDate(finDia.getDate() + 1);

  const turnos = await prisma.turno.findMany({
    where: {
      casetaId: ctx.casetaSeleccionada.id,
      edicionId: ctx.edicion.id,
      fechaInicio: { gte: inicioDia, lt: finDia },
    },
    orderBy: { fechaInicio: "asc" },
    include: {
      asignaciones: {
        include: { empleado: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return {
    ...ctx,
    fecha,
    fechaAnterior: addDays(fecha, -1),
    turnos: turnos.map(turnoSerializable),
    hoyIso: hoyIso(),
    readonly: params.readonly ?? false,
  };
}

export async function loadSemanaTurnos(params: {
  lunes?: string;
  casetaId?: string;
  edicionId?: string;
  readonly?: boolean;
}): Promise<SemanaTurnos | null> {
  const lunes = params.lunes ? lunesDe(params.lunes) : lunesDe(hoyIso());
  const ctx = await loadContexto(params);
  if (!ctx) return null;

  const inicio = startOfDayLocal(lunes);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 7);

  const turnosRaw = await prisma.turno.findMany({
    where: {
      casetaId: ctx.casetaSeleccionada.id,
      edicionId: ctx.edicion.id,
      fechaInicio: { gte: inicio, lt: fin },
    },
    orderBy: { fechaInicio: "asc" },
    include: {
      asignaciones: {
        include: { empleado: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const turnos = turnosRaw.map(turnoSerializable);

  const dias: ResumenDiaSemana[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    const ymd = toYmd(d);
    const desde = d.getTime();
    const hasta = desde + 24 * 3600_000;
    const delDia = turnos.filter((t) => {
      const ti = new Date(t.fechaInicio).getTime();
      return ti >= desde && ti < hasta;
    });
    const empleadosSet = new Set<string>();
    for (const t of delDia) for (const a of t.asignaciones) empleadosSet.add(a.empleadoId);
    dias.push({ fecha: ymd, numTurnos: delDia.length, numPersonas: empleadosSet.size });
  }

  return {
    ...ctx,
    lunes,
    domingo: addDays(lunes, 6),
    dias,
    turnos,
    hoyIso: hoyIso(),
    readonly: params.readonly ?? false,
  };
}
