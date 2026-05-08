"use client";

import * as React from "react";
import { useState } from "react";
import type {
  EmpleadoMin,
  TipoEmpleadoLite,
  TurnoSerializable,
} from "../types";
import { ChipEmpleado } from "./ChipEmpleado";
import { AsignarEmpleado } from "./AsignarEmpleado";
import { DialogoEditarTurno } from "./DialogoEditarTurno";
import { duracionHoras, horaDe } from "../_lib/fechas";
import { cn } from "@/lib/utils";

type Props = {
  turno: TurnoSerializable;
  empleadosDisponibles: EmpleadoMin[];
  tiposEmpleado: TipoEmpleadoLite[];
  permiteAsistencia: boolean;
  readonly: boolean;
  index: number;
};

export function BloqueTurno({
  turno,
  empleadosDisponibles,
  tiposEmpleado,
  permiteAsistencia,
  readonly,
  index,
}: Props) {
  const [editando, setEditando] = useState(false);

  const yaAsignados = new Set(turno.asignaciones.map((a) => a.empleadoId));
  const duracion = duracionHoras(turno.fechaInicio, turno.fechaFin);
  const inicio = horaDe(turno.fechaInicio);
  const fin = horaDe(turno.fechaFin);

  const tiposPorId = new Map(tiposEmpleado.map((t) => [t.id, t]));
  const ordenDe = (tipoId: string) => tiposPorId.get(tipoId)?.orden ?? 999;

  // Ordenar asignaciones según orden del TipoEmpleado.
  const asignacionesOrdenadas = [...turno.asignaciones].sort(
    (a, b) => ordenDe(a.tipoEmpleadoId) - ordenDe(b.tipoEmpleadoId)
  );

  // Plazas pendientes por tipo (plazas - asignados del mismo tipo).
  const plazasPorTipo = new Map(
    turno.plazas.map((p) => [p.tipoEmpleadoId, p.cantidad])
  );
  const asignadosPorTipo = new Map<string, number>();
  for (const a of turno.asignaciones) {
    asignadosPorTipo.set(
      a.tipoEmpleadoId,
      (asignadosPorTipo.get(a.tipoEmpleadoId) ?? 0) + 1
    );
  }
  const plazasPendientes = Array.from(plazasPorTipo.entries()).reduce(
    (total, [tipoId, cantidad]) =>
      total + Math.max(0, cantidad - (asignadosPorTipo.get(tipoId) ?? 0)),
    0
  );

  return (
    <article
      className={cn(
        "rounded-lg border bg-card/80 shadow-sm",
        "animate-stagger"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <button
          type="button"
          onClick={() => !readonly && setEditando(true)}
          disabled={readonly}
          className={cn(
            "text-left flex items-center gap-3 flex-1 flex-wrap",
            !readonly && "hover:text-primary transition-colors"
          )}
        >
          <span className="font-mono text-base font-semibold tracking-tight">
            {inicio}–{fin}
          </span>
          <span className="text-xs text-muted-foreground">
            {duracion}h · {turno.asignaciones.length}{" "}
            {turno.asignaciones.length === 1 ? "persona" : "personas"}
          </span>
          {plazasPendientes > 0 ? (
            <span className="text-xs font-medium text-destructive">
              {plazasPendientes} plaza{plazasPendientes > 1 ? "s" : ""} sin cubrir
            </span>
          ) : turno.plazas.length > 0 ? (
            <span className="text-xs text-muted-foreground">✓ completo</span>
          ) : null}
        </button>
      </header>
      <div className="px-4 py-3 flex flex-wrap items-center gap-1.5">
        {turno.asignaciones.length === 0 && turno.plazas.length === 0 ? (
          <p className="text-xs text-muted-foreground italic pr-2">
            Sin empleados asignados
          </p>
        ) : turno.asignaciones.length === 0 && turno.plazas.length > 0 ? (
          <p className="text-xs text-muted-foreground italic pr-2">
            Pendiente de asignar —{" "}
            {turno.plazas
              .map((p) => {
                const tipo = tiposPorId.get(p.tipoEmpleadoId);
                return `${p.cantidad} ${tipo?.label.toLowerCase() ?? "?"}`;
              })
              .join(", ")}
          </p>
        ) : (
          asignacionesOrdenadas.map((a) => {
            const tipo = tiposPorId.get(a.tipoEmpleadoId);
            if (!tipo) return null;
            return (
              <ChipEmpleado
                key={a.empleadoId}
                turnoId={turno.id}
                empleadoId={a.empleadoId}
                nombre={a.empleadoNombre}
                esVoluntario={a.esVoluntario}
                tipo={tipo}
                asistio={a.asistio}
                permiteAsistencia={permiteAsistencia}
                readonly={readonly}
              />
            );
          })
        )}
        {!readonly ? (
          <AsignarEmpleado
            turnoId={turno.id}
            empleados={empleadosDisponibles}
            yaAsignados={yaAsignados}
            tiposEmpleado={tiposEmpleado}
            plazas={turno.plazas}
            asignadosPorTipo={Object.fromEntries(asignadosPorTipo)}
          />
        ) : null}
      </div>
      {editando ? (
        <DialogoEditarTurno
          open={editando}
          onClose={() => setEditando(false)}
          turno={turno}
          tiposEmpleado={tiposEmpleado}
        />
      ) : null}
    </article>
  );
}
