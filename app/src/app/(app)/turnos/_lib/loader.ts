import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  DiaTurnos,
  SemanaTurnos,
  TurnoSerializable,
  TurnoPlazaSerializable,
  AsignacionSerializable,
  ResumenDiaSemana,
  DesglosePerfil,
  CasetaMin,
  EmpleadoMin,
  EdicionMin,
  TipoEmpleadoLite,
} from "../types";
import { addDays, hoyIso, lunesDe } from "./fechas";

// Multi-caseta: necesitamos una edición activa para filtrar. Si no hay
// edición activa, devolvemos datos vacíos con una primera edición disponible.

// Los turnos se almacenan con timestamps UTC (minuto=0 UTC, ver schema.ts e
// isoHora en los formularios). El día de un turno es el día UTC de fechaInicio,
// no el día local del servidor (que en dev difiere y haría que un turno de
// 22:00 apareciera en el día siguiente).
function startOfDayUtc(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
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
  tipoEmpleadoId: string;
}): EmpleadoMin {
  return {
    id: e.id,
    nombre: e.nombre,
    activo: e.activo,
    esVoluntario: e.jornalDiario === null,
    tipoEmpleadoId: e.tipoEmpleadoId,
  };
}

function tipoEmpleadoLite(t: {
  id: string;
  slug: string;
  label: string;
  labelCorto: string;
  colorHex: string;
  esVoluntario: boolean;
  orden: number;
}): TipoEmpleadoLite {
  return {
    id: t.id,
    slug: t.slug,
    label: t.label,
    labelCorto: t.labelCorto,
    colorHex: t.colorHex,
    esVoluntario: t.esVoluntario,
    orden: t.orden,
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
    empleado: {
      nombre: string;
      jornalDiario: { toString(): string } | null;
      tipoEmpleadoId: string;
    };
  }[];
  plazas: { tipoEmpleadoId: string; cantidad: number }[];
};

function turnoSerializable(t: TurnoRaw): TurnoSerializable {
  const asignaciones: AsignacionSerializable[] = t.asignaciones.map((a) => ({
    empleadoId: a.empleadoId,
    empleadoNombre: a.empleado.nombre,
    esVoluntario: a.empleado.jornalDiario === null,
    tipoEmpleadoId: a.empleado.tipoEmpleadoId,
    asistio: a.asistio,
  }));
  const plazas: TurnoPlazaSerializable[] = t.plazas.map((p) => ({
    tipoEmpleadoId: p.tipoEmpleadoId,
    cantidad: p.cantidad,
  }));
  return {
    id: t.id,
    edicionId: t.edicionId,
    casetaId: t.casetaId,
    fechaInicio: t.fechaInicio.toISOString(),
    fechaFin: t.fechaFin.toISOString(),
    asignaciones,
    plazas,
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
  tiposEmpleado: TipoEmpleadoLite[];
} | null> {
  const [ediciones, casetas, empleados, tipos] = await Promise.all([
    prisma.edicion.findMany({ orderBy: [{ activa: "desc" }, { anio: "desc" }] }),
    prisma.caseta.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.empleado.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.tipoEmpleado.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
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
    tiposEmpleado: tipos.map(tipoEmpleadoLite),
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

  const inicioDia = startOfDayUtc(fecha);
  const finDia = new Date(inicioDia);
  finDia.setUTCDate(finDia.getUTCDate() + 1);

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
      plazas: true,
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

  const inicio = startOfDayUtc(lunes);
  const fin = new Date(inicio);
  fin.setUTCDate(fin.getUTCDate() + 7);

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
      plazas: true,
    },
  });
  const turnos = turnosRaw.map(turnoSerializable);

  const dias: ResumenDiaSemana[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio);
    d.setUTCDate(d.getUTCDate() + i);
    const ymd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const desde = d.getTime();
    const hasta = desde + 24 * 3600_000;
    const delDia = turnos.filter((t) => {
      const ti = new Date(t.fechaInicio).getTime();
      return ti >= desde && ti < hasta;
    });
    const empleadosSet = new Set<string>();
    for (const t of delDia) for (const a of t.asignaciones) empleadosSet.add(a.empleadoId);

    // Desglose por tipo: sumar asignados y plazas esperadas en todos los turnos del día.
    const asignadosPorTipo = new Map<string, Set<string>>();
    const plazasPorTipo = new Map<string, number>();
    for (const t of delDia) {
      for (const a of t.asignaciones) {
        if (!asignadosPorTipo.has(a.tipoEmpleadoId)) asignadosPorTipo.set(a.tipoEmpleadoId, new Set());
        asignadosPorTipo.get(a.tipoEmpleadoId)!.add(a.empleadoId);
      }
      for (const p of t.plazas) {
        plazasPorTipo.set(p.tipoEmpleadoId, (plazasPorTipo.get(p.tipoEmpleadoId) ?? 0) + p.cantidad);
      }
    }
    const tiposConDatos = new Set<string>([
      ...asignadosPorTipo.keys(),
      ...plazasPorTipo.keys(),
    ]);
    // Orden por TipoEmpleado.orden.
    const tiposOrdenados = ctx.tiposEmpleado
      .filter((t) => tiposConDatos.has(t.id))
      .map((t) => t.id);
    const desglose: DesglosePerfil[] = tiposOrdenados.map((tipoEmpleadoId) => ({
      tipoEmpleadoId,
      asignados: asignadosPorTipo.get(tipoEmpleadoId)?.size ?? 0,
      plazas: plazasPorTipo.get(tipoEmpleadoId) ?? 0,
    }));

    dias.push({
      fecha: ymd,
      numTurnos: delDia.length,
      numPersonas: empleadosSet.size,
      desglose,
    });
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
