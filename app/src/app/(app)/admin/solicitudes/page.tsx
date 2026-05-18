import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { SectionHeader } from "../_components/page-header";
import { FiltroEdicion } from "./_components/filtro-edicion";
import { TabsSolicitudes } from "./_components/tabs-solicitudes";
import type { EstadoSolicitud } from "@prisma/client";

const ESTADOS: EstadoSolicitud[] = [
  "pendiente",
  "aprobada",
  "parcial",
  "rechazada",
  "cancelada",
];

type SP = Promise<{ estado?: string; edicionId?: string }>;

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

  const ediciones = await prisma.edicion.findMany({
    orderBy: [{ activa: "desc" }, { anio: "desc" }],
    select: { id: true, anio: true, nombre: true, activa: true },
  });

  const filtroBase = {
    estado: estadoFiltro,
    ...(sp.edicionId ? { edicionId: sp.edicionId } : {}),
  } as const;

  const [solicitudesVoluntario, solicitudesEmpleado] = await Promise.all([
    prisma.solicitudVoluntario.findMany({
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
    }),
    prisma.solicitudEmpleado.findMany({
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
    }),
  ]);

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

      <TabsSolicitudes
        solicitudesVoluntario={solicitudesVoluntario}
        solicitudesEmpleado={solicitudesEmpleado}
        estadoFiltro={estadoFiltro}
      />
    </div>
  );
}
