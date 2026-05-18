import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { SectionHeader } from "../_components/page-header";
import { FiltroEdicion } from "./_components/filtro-edicion";
import { TabsSolicitudes } from "./_components/tabs-solicitudes";
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import type { EstadoSolicitud } from "@prisma/client";

const ESTADOS: EstadoSolicitud[] = [
  "pendiente",
  "aprobada",
  "parcial",
  "rechazada",
  "cancelada",
];

type SP = Promise<{
  estado?: string;
  edicionId?: string;
  page?: string;
  pageSize?: string;
  [key: string]: string | undefined;
}>;

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  await requireRole(["admin", "gerente"]);
  const sp = await searchParams;

  const estadoFiltro: EstadoSolicitud = ESTADOS.includes(
    sp.estado as EstadoSolicitud
  )
    ? (sp.estado as EstadoSolicitud)
    : "pendiente";

  const listParams = parseListParams(sp, {
    defaultPageSize: 25,
    allowedPageSizes: [10, 25, 50, 100],
    allowedSorts: [],
  });

  const ediciones = await prisma.edicion.findMany({
    orderBy: [{ activa: "desc" }, { anio: "desc" }],
    select: { id: true, anio: true, nombre: true, activa: true },
  });

  const filtroBase = {
    estado: estadoFiltro,
    ...(sp.edicionId ? { edicionId: sp.edicionId } : {}),
  } as const;

  // Contar totales para calcular paginación
  const [totalVoluntario, totalEmpleado] = await Promise.all([
    prisma.solicitudVoluntario.count({ where: filtroBase }),
    prisma.solicitudEmpleado.count({ where: filtroBase }),
  ]);
  const total = totalVoluntario + totalEmpleado;

  // Paginar sobre el conjunto combinado: primero voluntarios, luego empleados
  // Calculamos cuántos de cada tipo corresponden a esta página
  const skip = listParams.skip;
  const take = listParams.take;

  let skipVoluntario = 0;
  let takeVoluntario = 0;
  let skipEmpleado = 0;
  let takeEmpleado = 0;

  if (skip < totalVoluntario) {
    skipVoluntario = skip;
    takeVoluntario = Math.min(take, totalVoluntario - skip);
    const restante = take - takeVoluntario;
    if (restante > 0) {
      skipEmpleado = 0;
      takeEmpleado = restante;
    }
  } else {
    skipEmpleado = skip - totalVoluntario;
    takeEmpleado = take;
  }

  const [solicitudesVoluntario, solicitudesEmpleado] = await Promise.all([
    takeVoluntario > 0
      ? prisma.solicitudVoluntario.findMany({
          where: filtroBase,
          include: {
            entidad: { select: { nombre: true } },
            edicion: { select: { anio: true, nombre: true } },
            turnos: {
              include: {
                turno: { include: { caseta: { select: { nombre: true } } } },
              },
              orderBy: { turno: { fechaInicio: "asc" } },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: skipVoluntario,
          take: takeVoluntario,
        })
      : Promise.resolve([]),
    takeEmpleado > 0
      ? prisma.solicitudEmpleado.findMany({
          where: filtroBase,
          include: {
            edicion: { select: { anio: true, nombre: true } },
            turnos: {
              include: {
                turno: { include: { caseta: { select: { nombre: true } } } },
              },
              orderBy: { turno: { fechaInicio: "asc" } },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: skipEmpleado,
          take: takeEmpleado,
        })
      : Promise.resolve([]),
  ]);

  const filtroQueryParams = new URLSearchParams({
    estado: estadoFiltro,
    ...(sp.edicionId && { edicionId: sp.edicionId }),
  }).toString();

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Solicitudes"
        subtitle="Solicitudes de voluntariado y personal pendientes de revisión."
      />

      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="text-muted-foreground">Estado:</span>
        {ESTADOS.map((e) => {
          const isActive = e === estadoFiltro;
          const params = new URLSearchParams();
          params.set("estado", e);
          if (sp.edicionId) params.set("edicionId", sp.edicionId);
          return (
            <Link
              key={e}
              href={`/admin/solicitudes?${params.toString()}`}
              className={`px-3 py-1 rounded-md border text-xs uppercase tracking-wider ${
                isActive
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {e}
            </Link>
          );
        })}

        <span className="text-muted-foreground ml-4">Edición:</span>
        <FiltroEdicion
          ediciones={ediciones}
          edicionId={sp.edicionId ?? ""}
          estado={estadoFiltro}
        />
      </div>

      <div className="flex items-center justify-between">
        <PageSizeSelect
          currentPageSize={listParams.pageSize}
          basePath="/admin/solicitudes"
          queryParams={filtroQueryParams}
        />
        <span className="text-sm text-muted-foreground">
          {total} solicitudes
        </span>
      </div>

      <TabsSolicitudes
        solicitudesVoluntario={solicitudesVoluntario}
        solicitudesEmpleado={solicitudesEmpleado}
        estadoFiltro={estadoFiltro}
      />

      {total > listParams.pageSize && (
        <DataTablePagination
          page={listParams.page}
          pageSize={listParams.pageSize}
          total={total}
          basePath="/admin/solicitudes"
          queryParams={filtroQueryParams}
        />
      )}
    </div>
  );
}
