"use client";

import * as React from "react";
import { useActionState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import type { ActionResult } from "@/lib/action-result";
import { crearTurnoAction } from "../actions";
import type { SemanaTurnos } from "../types";
import { toIsoDate } from "../_lib/fechas";

export function DialogoNuevoTurno({
  semana,
  fechaInicioInicial,
  onClose,
}: {
  semana: SemanaTurnos;
  fechaInicioInicial?: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(crearTurnoAction, null);

  const inicial = fechaInicioInicial ? new Date(fechaInicioInicial) : new Date(`${semana.lunes}T09:00:00`);
  const [fecha, setFecha] = React.useState<string>(toIsoDate(inicial));
  const [horaInicio, setHoraInicio] = React.useState<string>(String(inicial.getHours()).padStart(2, "0"));
  const [horaFin, setHoraFin] = React.useState<string>(
    String((inicial.getHours() + 4) % 24).padStart(2, "0")
  );

  const wasOk = React.useRef(false);
  React.useEffect(() => {
    if (state?.ok && !wasOk.current) {
      wasOk.current = true;
      toast.show("Turno creado", "success");
      onClose();
    }
    if (state && !state.ok) {
      toast.show(state.error, "error");
    }
  }, [state, toast, onClose]);

  const errores = state && !state.ok ? state.fieldErrors ?? {} : {};

  // Construir ISO absoluto para enviar al action. Horas en punto (minuto = 0).
  const fechaInicioIso = buildIso(fecha, horaInicio);
  const finDate = buildDateCrossMidnight(fecha, horaInicio, horaFin);
  const fechaFinIso = finDate.toISOString();

  return (
    <Modal open onClose={onClose} title="Nuevo turno" description={`Caseta: ${semana.casetaSeleccionada.nombre}`}>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="edicionId" value={semana.edicion.id} />
        <input type="hidden" name="casetaId" value={semana.casetaSeleccionada.id} />
        <input type="hidden" name="fechaInicio" value={fechaInicioIso} />
        <input type="hidden" name="fechaFin" value={fechaFinIso} />

        <div>
          <Label htmlFor="empleadoId">Empleado</Label>
          <select
            id="empleadoId"
            name="empleadoId"
            required
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">— elegir —</option>
            {semana.empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
                {e.esVoluntario ? " (voluntario)" : ""}
              </option>
            ))}
          </select>
          <FieldError messages={errores.empleadoId} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              min={semana.lunes}
              max={semana.domingo}
              required
            />
          </div>
          <div>
            <Label htmlFor="horaInicio">Inicio</Label>
            <select
              id="horaInicio"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={String(h).padStart(2, "0")}>
                  {String(h).padStart(2, "0")}h
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="horaFin">Fin</Label>
            <select
              id="horaFin"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={String(h).padStart(2, "0")}>
                  {String(h).padStart(2, "0")}h
                </option>
              ))}
            </select>
          </div>
        </div>
        <FieldError messages={errores.fechaInicio} />
        <FieldError messages={errores.fechaFin} />
        <p className="text-xs text-muted-foreground">
          Si la hora fin es menor o igual a la de inicio, el turno se considera hasta el día siguiente.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Creando…" : "Crear turno"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p className="text-xs text-destructive-foreground bg-destructive/90 rounded-sm px-2 py-1">
      {messages.join(" · ")}
    </p>
  );
}

function buildIso(fechaYmd: string, hora: string): string {
  const [y, m, d] = fechaYmd.split("-").map((x) => parseInt(x, 10));
  const h = parseInt(hora, 10);
  return new Date(y, m - 1, d, h, 0, 0, 0).toISOString();
}

function buildDateCrossMidnight(fechaYmd: string, horaIni: string, horaFin: string): Date {
  const [y, m, d] = fechaYmd.split("-").map((x) => parseInt(x, 10));
  const hi = parseInt(horaIni, 10);
  const hf = parseInt(horaFin, 10);
  const dd = new Date(y, m - 1, d, hf, 0, 0, 0);
  if (hf <= hi) dd.setDate(dd.getDate() + 1);
  return dd;
}
