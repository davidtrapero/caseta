import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { SectionHeader, EmptyState } from "../_components/page-header";
import { AccionesSolicitud } from "./_components/acciones";
import { FiltroEdicion } from "./_components/filtro-edicion";
import type { EstadoSolicitud } from "@prisma/client";

const ESTADOS: EstadoSolicitud[] = [
  "pendiente",
  "aprobada",
  "parcial",
  "rechazada",
  "cancelada",
];

const FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function badgeVariantPara(estado: EstadoSolicitud) {
  switch (estado) {
    case "pendiente":
      return "default" as const;
    case "aprobada":
      return "active" as const;
    case "parcial":
      return "default" as const;
    case "rechazada":
      return "destructive" as const;
    case "cancelada":
      return "muted" as const;
  }
}

type SP = Promise<{ estado?: string; edicionId?: string }>;

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  await requireRole(["admin", "gerente"]);
  const sp = await searchParams;

  const estadoFiltro: EstadoSolicitud | undefined = ESTADOS.includes(
    sp.estado as EstadoSolicitud
  )
    ? (sp.estado as EstadoSolicitud)
    : "pendiente";

  const ediciones = await prisma.edicion.findMany({
    orderBy: [{ activa: "desc" }, { anio: "desc" }],
    select: { id: true, anio: true, nombre: true, activa: true },
  });

  const solicitudes = await prisma.solicitudVoluntario.findMany({
    where: {
      estado: estadoFiltro,
      ...(sp.edicionId ? { edicionId: sp.edicionId } : {}),
    },
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
  });

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Solicitudes de voluntarios"
        subtitle="Solicitudes de voluntarios pendientes de revisión."
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

      {solicitudes.length === 0 ? (
        <EmptyState
          title="Sin solicitudes"
          description={`No hay solicitudes en estado "${estadoFiltro}".`}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {solicitudes.map((s) => (
            <article
              key={s.id}
              className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4 flex flex-col gap-3"
              style={{ boxShadow: "var(--surface-glass-shadow)" }}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-medium">{s.nombre}</h3>
                  <Badge variant={badgeVariantPara(s.estado)}>{s.estado}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[s.telefono, s.email].filter(Boolean).join(" · ")} · {s.entidad.nombre} · {s.edicion.anio}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recibida {FECHA.format(s.createdAt)}
                </p>
              </div>

              {s.observaciones ? (
                <p className="text-sm bg-muted/40 rounded p-2">{s.observaciones}</p>
              ) : null}

              <AccionesSolicitud
                solicitudId={s.id}
                turnos={s.turnos.map((t) => ({
                  id: t.id,
                  estado: t.estado,
                  motivoRechazo: t.motivoRechazo,
                  fechaInicio: t.turno.fechaInicio,
                  fechaFin: t.turno.fechaFin,
                  casetaNombre: t.turno.caseta.nombre,
                }))}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
