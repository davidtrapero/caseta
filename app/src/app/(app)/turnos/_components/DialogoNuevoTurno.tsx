"use client";

import * as React from "react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { crearTurnoAction } from "../actions";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/toaster";
import type { EmpleadoMin, TipoEmpleadoLite } from "../types";
import { colorFor, ordenarTipos } from "../_lib/perfiles";
import { cn } from "@/lib/utils";
import { FieldError, FormError } from "../../admin/_components/page-header";

type Props = {
  open: boolean;
  onClose: () => void;
  edicionId: string;
  casetaId: string;
  fecha: string; // YYYY-MM-DD
  empleados: EmpleadoMin[];
  tiposEmpleado: TipoEmpleadoLite[];
};

// Construye ISO timestamp en UTC con minutos=0 (el schema exige minuto 0 UTC).
function isoHora(fecha: string, hora: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  // Usamos Date.UTC para garantizar minuto=0 UTC.
  // Nota: esto trata la hora como UTC. El backend interpreta igual.
  return new Date(Date.UTC(y, m - 1, d, hora, 0, 0)).toISOString();
}

export function DialogoNuevoTurno({
  open,
  onClose,
  edicionId,
  casetaId,
  fecha,
  empleados,
  tiposEmpleado,
}: Props) {
  const tiposOrdenados = ordenarTipos(tiposEmpleado);

  const [horaInicio, setHoraInicio] = useState(12);
  const [horaFin, setHoraFin] = useState(18);
  const [cruzaMedianoche, setCruzaMedianoche] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [plazas, setPlazas] = useState<Record<string, number>>(() =>
    Object.fromEntries(tiposOrdenados.map((t) => [t.id, 0]))
  );

  const [state, action, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(crearTurnoAction, null);

  const { show } = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state && state !== last.current) {
      last.current = state;
      if (state.ok) {
        show("Turno creado", "success");
        // queueMicrotask: evita setState síncrono en effect (react-hooks/set-state-in-effect)
        queueMicrotask(() => {
          setSeleccionados([]);
          setPlazas(Object.fromEntries(tiposOrdenados.map((t) => [t.id, 0])));
          onClose();
        });
      } else {
        show(state.error, "error");
      }
    }
  }, [state, show, onClose, tiposOrdenados]);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  const fechaFinYmd = cruzaMedianoche
    ? (() => {
        const [y, m, d] = fecha.split("-").map(Number);
        const dd = new Date(y, m - 1, d);
        dd.setDate(dd.getDate() + 1);
        return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
      })()
    : fecha;

  const fechaInicioIso = isoHora(fecha, horaInicio);
  const fechaFinIso = isoHora(fechaFinYmd, horaFin);

  const toggle = (id: string) => {
    setSeleccionados((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo turno"
      description="Define el horario y los empleados asignados (0..N)."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Submit manual con startTransition: evita el form.reset() automático
          // que React 19 dispara con <form action={...}> tras cada resolución,
          // de modo que tras un error se preservan los selects de hora.
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}
        className="flex flex-col gap-4"
      >
        {state && !state.ok ? <FormError message={state.error} /> : null}
        <input type="hidden" name="edicionId" value={edicionId} />
        <input type="hidden" name="casetaId" value={casetaId} />
        <input type="hidden" name="fechaInicio" value={fechaInicioIso} />
        <input type="hidden" name="fechaFin" value={fechaFinIso} />
        <input
          type="hidden"
          name="empleadoIdsJson"
          value={JSON.stringify(seleccionados)}
        />
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
            <Label htmlFor="hi">Hora inicio</Label>
            <select
              id="hi"
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
            <Label htmlFor="hf">Hora fin</Label>
            <select
              id="hf"
              value={horaFin}
              onChange={(e) => setHoraFin(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
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
          <span>Fin en el día siguiente (cruza medianoche)</span>
        </label>

        <div>
          <Label>Empleados asignados ({seleccionados.length})</Label>
          <div className="mt-1 max-h-56 overflow-auto rounded-md border border-border p-2 flex flex-wrap gap-1.5">
            {empleados.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay empleados activos.
              </p>
            ) : (
              empleados.map((e) => {
                const sel = seleccionados.includes(e.id);
                return (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => toggle(e.id)}
                    className={cn(
                      "text-xs rounded-sm border px-2 py-1 transition-colors",
                      sel
                        ? "bg-primary/20 border-primary text-foreground"
                        : "bg-background border-border text-muted-foreground hover:border-primary/60"
                    )}
                  >
                    {e.nombre}
                    {e.esVoluntario ? (
                      <span className="ml-1 text-[9px] uppercase tracking-wider opacity-70">
                        vol.
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Puedes crear el turno sin empleados y asignarlos después.
          </p>
        </div>

        <div>
          <Label>Plazas esperadas por tipo (opcional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Reserva plazas para asignar después. Deja a 0 si no aplica.
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

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Creando…" : "Crear turno"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
