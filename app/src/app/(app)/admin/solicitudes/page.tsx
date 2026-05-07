import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { SectionHeader, EmptyState } from "../_components/page-header";
import { AccionesSolicitud } from "./_components/acciones";
import { FiltroEdicion } from "./_components/filtro-edicion";
import type { EstadoSolicitud } from "@prisma/client";

const ESTADOS: EstadoSolicitud[] = ["pendiente", "aprobada", "rechazada", "cancelada"];

const FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const FECHA_TURNO = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
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
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Solicitudes de voluntarios"
        subtitle="Aprueba o rechaza solicitudes recibidas desde el formulario público."
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
              className="rounded-lg border bg-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
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
                {s.estado === "pendiente" ? (
                  <AccionesSolicitud solicitudId={s.id} />
                ) : null}
              </div>

              {s.observaciones ? (
                <p className="text-sm bg-muted/40 rounded p-2">{s.observaciones}</p>
              ) : null}

              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Turnos solicitados ({s.turnos.length})
                </p>
                <ul className="text-sm flex flex-col gap-0.5">
                  {s.turnos.map((t) => (
                    <li key={t.id} className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {FECHA_TURNO.format(t.turno.fechaInicio)}–
                        {FECHA_TURNO.format(t.turno.fechaFin).split(" ").pop()}
                      </span>
                      <span>· {t.turno.caseta.nombre}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
