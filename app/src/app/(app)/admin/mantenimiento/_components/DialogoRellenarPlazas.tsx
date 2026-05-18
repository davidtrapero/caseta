"use client";

import * as React from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { rellenarPlazasTurnosSinPlazasAction } from "../../../turnos/actions";
import type { ActionResult } from "@/lib/action-result";
import { FormError } from "../../_components/page-header";

type TipoEmpleado = { id: string; label: string; esVoluntario: boolean };
type Caseta = { id: string; nombre: string };
type ResumenCaseta = { casetaId: string; casetaNombre: string; total: number };

type Props = {
  total: number;
  porCaseta: ResumenCaseta[];
  tiposEmpleado: TipoEmpleado[];
  casetas: Caseta[];
};

type Fila = { tipoEmpleadoId: string; cantidad: number };

export function DialogoRellenarPlazas({
  total,
  porCaseta,
  tiposEmpleado,
  casetas,
}: Props) {
  const [open, setOpen] = useState(false);

  const tipoVoluntarioPorDefecto =
    tiposEmpleado.find((t) => t.esVoluntario)?.id ?? tiposEmpleado[0]?.id ?? "";

  const [casetaId, setCasetaId] = useState<string>("");
  const [filas, setFilas] = useState<Fila[]>([
    { tipoEmpleadoId: tipoVoluntarioPorDefecto, cantidad: 1 },
  ]);

  const [state, action, pending] = useActionState<
    ActionResult<{ rellenados: number }> | null,
    FormData
  >(rellenarPlazasTurnosSinPlazasAction, null);

  const { show } = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state && state !== last.current) {
      last.current = state;
      if (state.ok) {
        show(`${state.data.rellenados} turnos rellenados`, "success");
        // queueMicrotask: evita setState síncrono en effect (react-hooks/set-state-in-effect)
        queueMicrotask(() => setOpen(false));
      } else {
        show(state.error, "error");
      }
    }
  }, [state, show]);

  const totalAfectado = casetaId
    ? porCaseta.find((c) => c.casetaId === casetaId)?.total ?? 0
    : total;

  function actualizarFila(idx: number, patch: Partial<Fila>) {
    setFilas((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    );
  }

  function eliminarFila(idx: number) {
    setFilas((prev) => prev.filter((_, i) => i !== idx));
  }

  function añadirFila() {
    setFilas((prev) => [
      ...prev,
      { tipoEmpleadoId: tipoVoluntarioPorDefecto, cantidad: 1 },
    ]);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (filas.length === 0) {
      e.preventDefault();
      show("Define al menos una plaza", "error");
      return;
    }
    const tiposVistos = new Set<string>();
    for (const f of filas) {
      if (!f.tipoEmpleadoId) {
        e.preventDefault();
        show("Selecciona el tipo en cada fila", "error");
        return;
      }
      if (tiposVistos.has(f.tipoEmpleadoId)) {
        e.preventDefault();
        show("No puedes repetir el mismo tipo de empleado", "error");
        return;
      }
      tiposVistos.add(f.tipoEmpleadoId);
    }
    const ok = window.confirm(
      `Vas a rellenar plazas en ${totalAfectado} turnos. Esta acción es irreversible. ¿Continuar?`
    );
    if (!ok) {
      e.preventDefault();
    }
  }

  const disabledBoton = total === 0 || tiposEmpleado.length === 0;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabledBoton}
      >
        Rellenar plazas en turnos huérfanos
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Rellenar plazas en turnos huérfanos"
        description="Aplica una plantilla de plazas a los turnos sin plazas de la edición activa."
      >
        <form action={action} onSubmit={onSubmit} className="flex flex-col gap-4">
          {state && !state.ok ? <FormError message={state.error} /> : null}

          <div>
            <Label htmlFor="casetaId">Caseta</Label>
            <select
              id="casetaId"
              name="casetaId"
              value={casetaId}
              onChange={(e) => setCasetaId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="">Todas las casetas</option>
              {casetas.map((c) => {
                const resumen = porCaseta.find((r) => r.casetaId === c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {resumen ? ` (${resumen.total} sin plazas)` : ""}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Se afectarán {totalAfectado} turno
              {totalAfectado === 1 ? "" : "s"}.
            </p>
          </div>

          <div>
            <Label>Plazas a aplicar</Label>
            <div className="flex flex-col gap-2 mt-1">
              {filas.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={f.tipoEmpleadoId}
                    onChange={(e) =>
                      actualizarFila(idx, { tipoEmpleadoId: e.target.value })
                    }
                    className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    {tiposEmpleado.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                        {t.esVoluntario ? " (voluntariado)" : ""}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={f.cantidad}
                    onChange={(e) =>
                      actualizarFila(idx, {
                        cantidad: Math.max(
                          1,
                          Math.min(99, Number(e.target.value) || 1)
                        ),
                      })
                    }
                    className="w-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminarFila(idx)}
                    disabled={filas.length === 1}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={añadirFila}
                  disabled={filas.length >= tiposEmpleado.length}
                >
                  + Añadir plaza
                </Button>
              </div>
            </div>
          </div>

          <input type="hidden" name="plazasJson" value={JSON.stringify(filas)} />

          <p className="text-xs text-muted-foreground">
            Se inserta la misma plantilla en todos los turnos sin plazas
            seleccionados. Los turnos que ya tienen alguna plaza no se tocan.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={pending || totalAfectado === 0}>
              {pending ? "Aplicando…" : "Aplicar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
