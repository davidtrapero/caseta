"use client";

import * as React from "react";
import { useState } from "react";
import type { DiaTurnos } from "../types";
import { BloqueTurno } from "./BloqueTurno";
import { DialogoNuevoTurno } from "./DialogoNuevoTurno";
import { DialogoDuplicarDia } from "./DialogoDuplicarDia";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Printer } from "lucide-react";
import Link from "next/link";

type Props = {
  dia: DiaTurnos;
  puedeEditar: boolean;
};

export function CalendarioDia({ dia, puedeEditar }: Props) {
  const [nuevo, setNuevo] = useState(false);
  const [duplicar, setDuplicar] = useState(false);

  // Asistencia editable solo si la fecha es <= hoy y hay permiso.
  const permiteAsistencia = puedeEditar && dia.fecha <= dia.hoyIso;
  const readonly = !puedeEditar || dia.readonly;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {!readonly ? (
          <Button onClick={() => setNuevo(true)} size="sm">
            <Plus className="h-4 w-4" /> Nuevo turno
          </Button>
        ) : null}
        {!readonly ? (
          <Button variant="outline" size="sm" onClick={() => setDuplicar(true)}>
            <Copy className="h-4 w-4" /> Duplicar día anterior
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="sm">
          <Link
            href={`/turnos/imprimir?fecha=${dia.fecha}&casetaId=${dia.casetaSeleccionada.id}`}
            target="_blank"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link
            href={`/turnos/semana?casetaId=${dia.casetaSeleccionada.id}`}
          >
            Ver semana
          </Link>
        </Button>
      </div>

      {dia.turnos.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card/40 p-10 text-center">
          <h3 className="text-base font-medium">Sin turnos este día</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {readonly
              ? "No hay turnos programados."
              : "Crea el primer turno o duplica el del día anterior."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {dia.turnos.map((t, i) => (
            <BloqueTurno
              key={t.id}
              turno={t}
              empleadosDisponibles={dia.empleados}
              tiposEmpleado={dia.tiposEmpleado}
              permiteAsistencia={permiteAsistencia}
              readonly={readonly}
              index={i}
            />
          ))}
        </div>
      )}

      {nuevo ? (
        <DialogoNuevoTurno
          open={nuevo}
          onClose={() => setNuevo(false)}
          edicionId={dia.edicion.id}
          casetaId={dia.casetaSeleccionada.id}
          fecha={dia.fecha}
          empleados={dia.empleados}
          tiposEmpleado={dia.tiposEmpleado}
        />
      ) : null}

      {duplicar ? (
        <DialogoDuplicarDia
          open={duplicar}
          onClose={() => setDuplicar(false)}
          casetaId={dia.casetaSeleccionada.id}
          edicionId={dia.edicion.id}
          diaOrigen={dia.fecha}
          duplicarDesdeAnterior
          diaAnterior={dia.fechaAnterior}
        />
      ) : null}
    </div>
  );
}
