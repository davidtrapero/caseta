"use client";

import * as React from "react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { actualizarTurnoYPlazasAction, eliminarTurnoAction } from "../actions";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/toaster";
import type { TipoEmpleadoLite, TurnoSerializable } from "../types";
import { colorFor, ordenarTipos } from "../_lib/perfiles";
import { FieldError, FormError, UnmappedFieldErrors } from "../../admin/_components/page-header";

function isoHora(fechaYmd: string, hora: number): string {
  const [y, m, d] = fechaYmd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hora, 0, 0)).toISOString();
}

function ymdDeIso(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  turno: TurnoSerializable;
  tiposEmpleado: TipoEmpleadoLite[];
};

export function DialogoEditarTurno({ open, onClose, turno, tiposEmpleado }: Props) {
  const inicioDate = new Date(turno.fechaInicio);
  const finDate = new Date(turno.fechaFin);

  const tiposOrdenados = ordenarTipos(tiposEmpleado);

  const [horaInicio, setHoraInicio] = useState(inicioDate.getUTCHours());
  const [horaFin, setHoraFin] = useState(finDate.getUTCHours() || 24);
  const fechaInicioYmd = ymdDeIso(turno.fechaInicio);
  const fechaFinYmd = ymdDeIso(turno.fechaFin);
  const [cruzaMedianoche, setCruzaMedianoche] = useState(
    fechaInicioYmd !== fechaFinYmd
  );
  const [plazas, setPlazas] = useState<Record<string, number>>(() => {
    const base = Object.fromEntries(tiposOrdenados.map((t) => [t.id, 0]));
    for (const p of turno.plazas) base[p.tipoEmpleadoId] = p.cantidad;
    return base;
  });

  const [state, action, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(actualizarTurnoYPlazasAction, null);

  const [delState, delAction, delPending] = useActionState<
    ActionResult<undefined> | null,
    FormData
  >(eliminarTurnoAction, null);

  const { show } = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state && state !== last.current) {
      last.current = state;
      if (state.ok) {
        show("Turno actualizado", "success");
        onClose();
      } else show(state.error, "error");
    }
  }, [state, show, onClose]);

  const lastDel = useRef(delState);
  useEffect(() => {
    if (delState && delState !== lastDel.current) {
      lastDel.current = delState;
      if (delState.ok) {
        show("Turno eliminado", "success");
        onClose();
      } else show(delState.error, "error");
    }
  }, [delState, show, onClose]);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  const finHora = horaFin === 24 ? 0 : horaFin;
  const finYmd = cruzaMedianoche
    ? (() => {
        const [y, m, d] = fechaInicioYmd.split("-").map(Number);
        const dd = new Date(Date.UTC(y, m - 1, d));
        dd.setUTCDate(dd.getUTCDate() + 1);
        return `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, "0")}-${String(
          dd.getUTCDate()
        ).padStart(2, "0")}`;
      })()
    : fechaInicioYmd;

  const fechaInicioIso = isoHora(fechaInicioYmd, horaInicio);
  const fechaFinIso = isoHora(finYmd, finHora);

  const handleEliminar = () => {
    if (!confirm("¿Eliminar este turno y todas sus asignaciones?")) return;
    const fd = new FormData();
    fd.set("_id", turno.id);
    fd.set("id", turno.id);
    startTransition(() => delAction(fd));
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar turno">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Submit manual con startTransition: evita el form.reset() automático
          // de React 19 con <form action={...}>, preservando los selects de
          // hora si la action devuelve error.
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}
        className="flex flex-col gap-4"
      >
        {state && !state.ok ? <FormError message={state.error} /> : null}
        <UnmappedFieldErrors
          fieldErrors={state && !state.ok ? state.fieldErrors : undefined}
          excluded={["fechaInicio", "fechaFin"]}
        />
        <input type="hidden" name="_id" value={turno.id} />
        <input type="hidden" name="id" value={turno.id} />
        <input type="hidden" name="edicionId" value={turno.edicionId} />
        <input type="hidden" name="casetaId" value={turno.casetaId} />
        <input type="hidden" name="fechaInicio" value={fechaInicioIso} />
        <input type="hidden" name="fechaFin" value={fechaFinIso} />
        <input
          type="hidden"
          name="plazasJson"
          value={JSON.stringify(
            tiposOrdenados
              .filter((t) => (plazas[t.id] ?? 0) > 0)
              .map((t) => ({ tipoEmpleadoId: t.id, cantidad: plazas[t.id] }))
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-hi">Hora inicio</Label>
            <select
              id="edit-hi"
              value={horaInicio}
              onChange={(e) => setHoraInicio(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
            <FieldError messages={errors.fechaInicio} />
          </div>
          <div>
            <Label htmlFor="edit-hf">Hora fin</Label>
            <select
              id="edit-hf"
              value={horaFin}
              onChange={(e) => setHoraFin(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h + 1} value={h === 23 ? 24 : h + 1}>
                  {String(h === 23 ? 24 : h + 1).padStart(2, "0")}:00
                </option>
              ))}
            </select>
            <FieldError messages={errors.fechaFin} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cruzaMedianoche}
            onChange={(e) => setCruzaMedianoche(e.target.checked)}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          <span>Fin en el día siguiente</span>
        </label>

        <div>
          <Label>Plazas del turno</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Ajusta el número de empleados esperados por tipo. No puedes bajar
            por debajo de los ya asignados.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tiposOrdenados.map((t) => {
              const colores = colorFor(t);
              return (
                <label
                  key={t.id}
                  className="flex items-center gap-1.5 rounded-sm border px-2 py-1.5 text-xs"
                  style={{ borderColor: colores.border, background: colores.bg, color: colores.text }}
                >
                  <span className="flex-1 font-medium">{t.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={plazas[t.id] ?? 0}
                    onChange={(e) =>
                      setPlazas((prev) => ({
                        ...prev,
                        [t.id]: Math.max(0, Math.min(99, Number(e.target.value) || 0)),
                      }))
                    }
                    className="w-10 rounded border border-current bg-transparent text-center text-xs [appearance:textfield]"
                    style={{ color: colores.text }}
                  />
                </label>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Las asignaciones de empleados se editan con los chips del propio turno.
        </p>

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
          <Button
            type="button"
            variant="destructive"
            disabled={delPending}
            onClick={handleEliminar}
          >
            {delPending ? "Eliminando…" : "Eliminar turno"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
