"use client";

import * as React from "react";
import { useActionState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import type { ActionResult } from "@/lib/action-result";
import { actualizarTurnoAction, eliminarTurnoAction } from "../actions";
import type { SemanaTurnos, TurnoSerializable } from "../types";
import { toIsoDate } from "../_lib/fechas";

export function DialogoEditarTurno({
  semana,
  turno,
  onClose,
}: {
  semana: SemanaTurnos;
  turno: TurnoSerializable;
  onClose: () => void;
}) {
  const toast = useToast();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(actualizarTurnoAction, null);

  const [deleteState, deleteAction, deletePending] = useActionState<
    ActionResult<undefined> | null,
    FormData
  >(eliminarTurnoAction, null);

  const inicio = new Date(turno.fechaInicio);
  const fin = new Date(turno.fechaFin);

  const [empleadoId, setEmpleadoId] = React.useState(turno.empleadoId);
  const [fecha, setFecha] = React.useState<string>(toIsoDate(inicio));
  const [horaInicio, setHoraInicio] = React.useState<string>(String(inicio.getHours()).padStart(2, "0"));
  const [horaFin, setHoraFin] = React.useState<string>(String(fin.getHours()).padStart(2, "0"));

  const wasOk = React.useRef(false);
  React.useEffect(() => {
    if (state?.ok && !wasOk.current) {
      wasOk.current = true;
      toast.show("Turno actualizado", "success");
      onClose();
    }
    if (state && !state.ok) toast.show(state.error, "error");
  }, [state, toast, onClose]);

  React.useEffect(() => {
    if (deleteState?.ok) {
      toast.show("Turno eliminado", "success");
      onClose();
    }
    if (deleteState && !deleteState.ok) toast.show(deleteState.error, "error");
  }, [deleteState, toast, onClose]);

  const errores = state && !state.ok ? state.fieldErrors ?? {} : {};

  const fechaInicioIso = buildIso(fecha, horaInicio);
  const fechaFinIso = buildDateCrossMidnight(fecha, horaInicio, horaFin).toISOString();

  const bloqueado = semana.readonly;

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar turno"
      description={`Empleado actual: ${turno.empleadoNombre}`}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="_id" value={turno.id} />
        <input type="hidden" name="id" value={turno.id} />
        <input type="hidden" name="edicionId" value={turno.edicionId} />
        <input type="hidden" name="casetaId" value={turno.casetaId} />
        <input type="hidden" name="fechaInicio" value={fechaInicioIso} />
        <input type="hidden" name="fechaFin" value={fechaFinIso} />

        <div>
          <Label htmlFor="empleadoId">Empleado</Label>
          <select
            id="empleadoId"
            name="empleadoId"
            value={empleadoId}
            onChange={(e) => setEmpleadoId(e.target.value)}
            disabled={bloqueado}
            required
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {semana.empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
                {e.esVoluntario ? " (voluntario)" : ""}
              </option>
            ))}
            {/* Si el empleado asignado no aparece (inactivo), incluirlo */}
            {!semana.empleados.some((e) => e.id === turno.empleadoId) ? (
              <option value={turno.empleadoId}>{turno.empleadoNombre} (inactivo)</option>
            ) : null}
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
              disabled={bloqueado}
              required
            />
          </div>
          <div>
            <Label htmlFor="horaInicio">Inicio</Label>
            <select
              id="horaInicio"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              disabled={bloqueado}
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
              disabled={bloqueado}
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

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 mt-2">
          <form action={deleteAction}>
            <input type="hidden" name="id" value={turno.id} />
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={bloqueado || deletePending}
              onClick={(e) => {
                if (!confirm("¿Eliminar este turno? Esta acción se registrará en el log.")) {
                  e.preventDefault();
                }
              }}
            >
              {deletePending ? "Eliminando…" : "Eliminar"}
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || bloqueado}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
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
