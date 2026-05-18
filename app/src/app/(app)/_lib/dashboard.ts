import "server-only";
import { prisma } from "@/lib/prisma";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { hoyIso, fromYmd } from "@/app/(app)/turnos/_lib/fechas";

export type OperativoData = {
  plazasEsperadas: number;
  plazasOcupadas: number;
  voluntariosPendientes: number;
  voluntariosAprobados: number;
  pedidosPendientes: number;
};

export type DashboardData = {
  edicion: { id: string; nombre: string; fechaInicio: string; fechaFin: string } | null;
  kpis: KpiData | null;
  operativo: OperativoData | null;
  turnosHoy: TurnoHoyData[];
  alertas: AlertaData[];
  actividad: ActividadData[];
};

export type KpiData = {
  ingresosEdicion: number;
  gastosEdicion: number;
  resultadoNeto: number;
};

export type TurnoHoyData = {
  id: string;
  casetaNombre: string;
  horaInicio: string;
  horaFin: string;
  asignados: number;
  plazasTotales: number;
  cubierto: boolean;
};

export type AlertaData = {
  tipo: "solicitud" | "cierre_faltante" | "pedido_pendiente";
  mensaje: string;
  href: string;
  count?: number;
};

export type ActividadData = {
  id: string;
  entidad: string;
  accion: string;
  usuarioNombre: string | null;
  fecha: string;
};

const FORMATO_HORA = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function formatHora(date: Date): string {
  return FORMATO_HORA.format(date);
}

const ENTIDAD_LABEL: Record<string, string> = {
  Turno: "Turno",
  TurnoEmpleado: "Asignación",
  CierreDiario: "Cierre",
  Gasto: "Gasto",
  Nomina: "Nómina",
  Pedido: "Pedido",
  Empleado: "Empleado",
  User: "Usuario",
  Stock: "Stock",
  Producto: "Producto",
  SolicitudVoluntario: "Solicitud",
};

const ACCION_LABEL: Record<string, string> = {
  create: "creado",
  update: "actualizado",
  delete: "eliminado",
};

export async function loadDashboard(rol: "admin" | "gerente" | "cajero"): Promise<DashboardData> {
  const edicion = await obtenerEdicionActiva();

  if (!edicion) {
    return { edicion: null, kpis: null, operativo: null, turnosHoy: [], alertas: [], actividad: [] };
  }

  const hoy = hoyIso();
  const inicioDia = fromYmd(hoy);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(inicioDia);
  finDia.setDate(finDia.getDate() + 1);

  // Para alertas de cierres faltantes: días pasados desde inicio de edición hasta hoy (exclusive)
  const fechaInicioEdicion = new Date(edicion.fechaInicio);
  const diasPasados: string[] = [];
  const cursor = new Date(fechaInicioEdicion);
  cursor.setHours(0, 0, 0, 0);
  const hoyDate = new Date(inicioDia);
  while (cursor < hoyDate) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    diasPasados.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  const esAdminOGerente = rol === "admin" || rol === "gerente";

  const [
    ingresosEdicionAgg,
    gastosEdicionAgg,
    turnosHoyRaw,
    solicitudesPendientes,
    cierresExistentes,
    pedidosPendientes,
    actividadRaw,
    plazasEsperadasAgg,
    plazasOcupadasCount,
    voluntariosPendientesCount,
    voluntariosAprobadosCount,
    pedidosPendientesCount,
  ] = await Promise.all([
    // KPI: ingresos acumulados edición
    prisma.cierreDiario.aggregate({
      where: { edicionId: edicion.id },
      _sum: { ingresosTotales: true },
    }),
    // KPI: gastos acumulados edición
    prisma.gasto.aggregate({
      where: { edicionId: edicion.id },
      _sum: { monto: true },
    }),
    // Turnos de hoy (todas las casetas)
    esAdminOGerente
      ? prisma.turno.findMany({
          where: {
            edicionId: edicion.id,
            fechaInicio: { gte: inicioDia, lt: finDia },
          },
          orderBy: { fechaInicio: "asc" },
          include: {
            caseta: { select: { nombre: true } },
            asignaciones: { select: { empleadoId: true } },
            plazas: { select: { cantidad: true } },
          },
        })
      : Promise.resolve([]),
    // Alertas: solicitudes pendientes
    esAdminOGerente
      ? prisma.solicitudVoluntario.count({
          where: { edicionId: edicion.id, estado: "pendiente" },
        })
      : Promise.resolve(0),
    // Alertas: cierres ya registrados en días pasados
    diasPasados.length > 0
      ? prisma.cierreDiario.findMany({
          where: {
            edicionId: edicion.id,
            fecha: {
              gte: new Date(diasPasados[0]),
              lt: hoyDate,
            },
          },
          select: { fecha: true, casetaId: true },
        })
      : Promise.resolve([]),
    // Alertas: pedidos pendientes sin fecha de recepción
    esAdminOGerente
      ? prisma.pedido.count({
          where: { edicionId: edicion.id, estado: "pendiente", fechaRecepcion: null },
        })
      : Promise.resolve(0),
    // Actividad reciente
    esAdminOGerente
      ? prisma.auditLog.findMany({
          orderBy: { fecha: "desc" },
          take: 8,
          include: { usuario: { select: { name: true } } },
        })
      : Promise.resolve([]),
    // Operativo: plazas esperadas
    prisma.turnoPlaza.aggregate({
      _sum: { cantidad: true },
      where: { turno: { edicionId: edicion.id } },
    }),
    // Operativo: plazas ocupadas
    prisma.turnoEmpleado.count({
      where: { turno: { edicionId: edicion.id } },
    }),
    // Operativo: voluntarios pendientes
    prisma.solicitudVoluntario.count({
      where: { edicionId: edicion.id, estado: "pendiente" },
    }),
    // Operativo: voluntarios aprobados
    prisma.solicitudVoluntario.count({
      where: { edicionId: edicion.id, estado: "aprobada" },
    }),
    // Operativo: pedidos pendientes (excluye recibido y cancelado)
    prisma.pedido.count({
      where: { edicionId: edicion.id, estado: { notIn: ["recibido", "cancelado"] } },
    }),
  ]);

  // KPIs
  const ingresosEdicion = Number(ingresosEdicionAgg._sum.ingresosTotales ?? 0);
  const gastosEdicion = Number(gastosEdicionAgg._sum.monto ?? 0);
  const resultadoNeto = ingresosEdicion - gastosEdicion;

  const kpis: KpiData = {
    ingresosEdicion,
    gastosEdicion,
    resultadoNeto,
  };

  // Turnos de hoy
  const turnosHoy: TurnoHoyData[] = turnosHoyRaw.map((t) => {
    const plazasTotales = t.plazas.reduce((sum, p) => sum + p.cantidad, 0);
    const asignados = t.asignaciones.length;
    return {
      id: t.id,
      casetaNombre: t.caseta.nombre,
      horaInicio: formatHora(t.fechaInicio),
      horaFin: formatHora(t.fechaFin),
      asignados,
      plazasTotales,
      cubierto: plazasTotales === 0 || asignados >= plazasTotales,
    };
  });

  // Alertas: cierres faltantes
  // Cuenta las casetas activas para detectar días sin ningún cierre
  const casetas = await prisma.caseta.findMany({ where: { activa: true }, select: { id: true } });
  const numCasetas = casetas.length;
  const cierresKey = new Set(cierresExistentes.map((c) => `${c.fecha.toISOString().slice(0, 10)}_${c.casetaId}`));
  let diasSinCierre = 0;
  for (const dia of diasPasados) {
    for (const c of casetas) {
      if (!cierresKey.has(`${dia}_${c.id}`)) {
        diasSinCierre++;
        break; // solo contar el día, no cada caseta
      }
    }
  }

  const alertas: AlertaData[] = [];

  if (esAdminOGerente && solicitudesPendientes > 0) {
    alertas.push({
      tipo: "solicitud",
      mensaje: `${solicitudesPendientes} solicitud${solicitudesPendientes > 1 ? "es" : ""} de voluntariado pendiente${solicitudesPendientes > 1 ? "s" : ""}`,
      href: "/admin/solicitudes",
      count: solicitudesPendientes,
    });
  }

  if (diasSinCierre > 0 && numCasetas > 0) {
    alertas.push({
      tipo: "cierre_faltante",
      mensaje: `${diasSinCierre} día${diasSinCierre > 1 ? "s" : ""} sin cierre registrado`,
      href: "/caja/cierres",
      count: diasSinCierre,
    });
  }

  if (esAdminOGerente && pedidosPendientes > 0) {
    alertas.push({
      tipo: "pedido_pendiente",
      mensaje: `${pedidosPendientes} pedido${pedidosPendientes > 1 ? "s" : ""} pendiente${pedidosPendientes > 1 ? "s" : ""} de recibir`,
      href: "/inventario/pedidos",
      count: pedidosPendientes,
    });
  }

  // Actividad reciente
  const actividad: ActividadData[] = actividadRaw.map((a) => ({
    id: a.id,
    entidad: ENTIDAD_LABEL[a.entidad] ?? a.entidad,
    accion: ACCION_LABEL[a.accion] ?? a.accion,
    usuarioNombre: a.usuario?.name ?? null,
    fecha: a.fecha.toISOString(),
  }));

  // Datos operativos
  const operativo: OperativoData = {
    plazasEsperadas: Number(plazasEsperadasAgg._sum.cantidad ?? 0),
    plazasOcupadas: plazasOcupadasCount,
    voluntariosPendientes: voluntariosPendientesCount,
    voluntariosAprobados: voluntariosAprobadosCount,
    pedidosPendientes: pedidosPendientesCount,
  };

  return {
    edicion: {
      id: edicion.id,
      nombre: edicion.nombre,
      fechaInicio: edicion.fechaInicio.toISOString(),
      fechaFin: edicion.fechaFin.toISOString(),
    },
    kpis,
    operativo,
    turnosHoy,
    alertas,
    actividad,
  };
}
