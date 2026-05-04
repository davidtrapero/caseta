"use client";

import * as React from "react";
import { useState } from "react";
import type { EmpleadoMin, TurnoSerializable } from "../types";
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
            "text-left flex items-center gap-3 flex-1",
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
        </button>
      </header>
      <div className="px-4 py-3 flex flex-wrap items-center gap-1.5">
        {turno.asignaciones.length === 0 ? (
          <p className="text-xs text-muted-foreground italic pr-2">
            Sin empleados asignados
          </p>
        ) : (
          turno.asignaciones.map((a) => (
            <ChipEmpleado
              key={a.empleadoId}
              turnoId={turno.id}
              empleadoId={a.empleadoId}
              nombre={a.empleadoNombre}
              esVoluntario={a.esVoluntario}
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
