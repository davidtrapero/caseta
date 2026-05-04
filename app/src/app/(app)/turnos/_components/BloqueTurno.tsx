"use client";

import * as React from "react";
import { useState } from "react";
import type { EmpleadoMin, TurnoSerializable } from "../types";
import { PERFIL_ORDEN, PERFIL_LABEL } from "../_lib/perfiles";
import { ChipEmpleado } from "./ChipEmpleado";
import { AsignarEmpleado } from "./AsignarEmpleado";
import { DialogoEditarTurno } from "./DialogoEditarTurno";
import { duracionHoras, horaDe } from "../_lib/fechas";
import { cn } from "@/lib/utils";

type Props = {
  turno: TurnoSerializable;
  empleadosDisponibles: EmpleadoMin[];
  permiteAsistencia: boolean;
  readonly: boolean;
  index: number;
};

export function BloqueTurno({
  turno,
  empleadosDisponibles,
  permiteAsistencia,
  readonly,
  index,
}: Props) {
  const [editando, setEditando] = useState(false);

  const yaAsignados = new Set(turno.asignaciones.map((a) => a.empleadoId));
  const duracion = duracionHoras(turno.fechaInicio, turno.fechaFin);
  const inicio = horaDe(turno.fechaInicio);
  const fin = horaDe(turno.fechaFin);

  // Ordenar asignaciones según PERFIL_ORDEN.
  const asignacionesOrdenadas = [...turno.asignaciones].sort(
    (a, b) => PERFIL_ORDEN.indexOf(a.perfil) - PERFIL_ORDEN.indexOf(b.perfil)
  );

  // Plazas pendientes por perfil (plazas - asignados del mismo perfil).
  const plazasPorPerfil = new Map(turno.plazas.map((p) => [p.perfil, p.cantidad]));
  const asignadosPorPerfil = new Map<string, number>();
  for (const a of turno.asignaciones) {
    asignadosPorPerfil.set(a.perfil, (asignadosPorPerfil.get(a.perfil) ?? 0) + 1);
  }
  const plazasPendientes = PERFIL_ORDEN.reduce(
    (total, p) => total + Math.max(0, (plazasPorPerfil.get(p) ?? 0) - (asignadosPorPerfil.get(p) ?? 0)),
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
            Pendiente de asignar — {turno.plazas.map((p) => `${p.cantidad} ${PERFIL_LABEL[p.perfil].toLowerCase()}`).join(", ")}
          </p>
        ) : (
          asignacionesOrdenadas.map((a) => (
            <ChipEmpleado
              key={a.empleadoId}
              turnoId={turno.id}
              empleadoId={a.empleadoId}
              nombre={a.empleadoNombre}
              esVoluntario={a.esVoluntario}
              perfil={a.perfil}
              asistio={a.asistio}
              permiteAsistencia={permiteAsistencia}
              readonly={readonly}
            />
          ))
        )}
        {!readonly ? (
          <AsignarEmpleado
            turnoId={turno.id}
            empleados={empleadosDisponibles}
            yaAsignados={yaAsignados}
            plazas={turno.plazas}
            asignadosPorPerfil={Object.fromEntries(asignadosPorPerfil)}
          />
        ) : null}
      </div>
      {editando ? (
        <DialogoEditarTurno
          open={editando}
          onClose={() => setEditando(false)}
          turno={turno}
        />
      ) : null}
    </article>
  );
}
