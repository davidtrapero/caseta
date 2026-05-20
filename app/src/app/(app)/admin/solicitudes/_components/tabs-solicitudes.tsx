"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AccionesSolicitud } from "./acciones";
import { AccionesEmpleado } from "./acciones-empleado";
import type { EstadoSolicitud, EstadoSolicitudTurno } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type SolicitudVoluntario = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  observaciones: string | null;
  estado: EstadoSolicitud;
  createdAt: Date | string;
  entidad: { nombre: string };
  edicion: { anio: number; nombre: string };
  turnos: Array<{
    id: string;
    estado: EstadoSolicitudTurno;
    motivoRechazo: string | null;
    turno: {
      fechaInicio: Date | string;
      fechaFin: Date | string;
      caseta: { nombre: string };
    };
  }>;
};

type SolicitudEmpleado = {
  id: string;
  dni: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  estado: EstadoSolicitud;
  createdAt: Date | string;
  edicion: { anio: number; nombre: string };
  turnos: Array<{
    id: string;
    estado: EstadoSolicitudTurno;
    motivoRechazo: string | null;
    turno: {
      fechaInicio: Date | string;
      fechaFin: Date | string;
      caseta: { nombre: string };
    };
  }>;
};

type Props = {
  solicitudesVoluntario: SolicitudVoluntario[];
  solicitudesEmpleado: SolicitudEmpleado[];
  estadoFiltro: EstadoSolicitud;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Componente ──────────────────────────────────────────────────────────────

export function TabsSolicitudes({
  solicitudesVoluntario,
  solicitudesEmpleado,
  estadoFiltro,
}: Props) {
  const [tab, setTab] = useState<"voluntarios" | "empleados">("voluntarios");

  return (
    <div className="flex flex-col gap-6">
      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("voluntarios")}
          className={cn(
            "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
            tab === "voluntarios"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Voluntarios
          {solicitudesVoluntario.length > 0 && (
            <span className="ml-2 text-xs tabular-nums opacity-70">
              {solicitudesVoluntario.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("empleados")}
          className={cn(
            "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
            tab === "empleados"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Empleados
          {solicitudesEmpleado.length > 0 && (
            <span className="ml-2 text-xs tabular-nums opacity-70">
              {solicitudesEmpleado.length}
            </span>
          )}
        </button>
      </div>

      {/* Voluntarios */}
      {tab === "voluntarios" && (
        <>
          {solicitudesVoluntario.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay solicitudes de voluntarios en estado &ldquo;{estadoFiltro}&rdquo;.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {solicitudesVoluntario.map((s) => (
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
                      Recibida {FECHA.format(new Date(s.createdAt))}
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
        </>
      )}

      {/* Empleados */}
      {tab === "empleados" && (
        <>
          {solicitudesEmpleado.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay solicitudes de empleados en estado &ldquo;{estadoFiltro}&rdquo;.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {solicitudesEmpleado.map((s) => (
                <article
                  key={s.id}
                  className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4 flex flex-col gap-3"
                  style={{ boxShadow: "var(--surface-glass-shadow)" }}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-medium">
                        {s.nombre}
                        {s.apellidos ? ` ${s.apellidos}` : ""}
                      </h3>
                      <Badge variant={badgeVariantPara(s.estado)}>{s.estado}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      DNI {s.dni}
                      {[s.telefono, s.email].filter(Boolean).length > 0
                        ? ` · ${[s.telefono, s.email].filter(Boolean).join(" · ")}`
                        : ""}
                      {" · "}{s.edicion.anio}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recibida {FECHA.format(new Date(s.createdAt))}
                    </p>
                  </div>

                  <AccionesEmpleado
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
        </>
      )}
    </div>
  );
}
