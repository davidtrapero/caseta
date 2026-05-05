"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import {
  FieldError,
  FormError,
} from "../../../admin/_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import { ajustarStockAction } from "../actions";

type Props = {
  casetaId: string;
  productoId: string;
  productoNombre: string;
  unidad: string;
  cantidadActual: number;
};

export function AjustarStockModal({
  casetaId,
  productoId,
  productoNombre,
  unidad,
  cantidadActual,
}: Props) {
  const [open, setOpen] = useState(false);
  const [nuevaCantidad, setNuevaCantidad] = useState(String(cantidadActual));

  const [state, action, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(ajustarStockAction, null);

  const { show } = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state && state !== last.current) {
      last.current = state;
      if (state.ok) {
        show("Stock ajustado", "success");
        // queueMicrotask: evita setState síncrono en effect (react-hooks/set-state-in-effect)
        queueMicrotask(() => setOpen(false));
      } else {
        show(state.error, "error");
      }
    }
  }, [state, show]);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const nueva = Number(nuevaCantidad);
  const diferencia = Number.isFinite(nueva) ? nueva - cantidadActual : 0;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setNuevaCantidad(String(cantidadActual));
          setOpen(true);
        }}
      >
        Ajustar
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Ajustar stock — ${productoNombre}`}
        description="Introduce la cantidad real tras el inventario físico. Se registrará un movimiento con la diferencia."
      >
        <form action={action} className="flex flex-col gap-4">
          {state && !state.ok ? <FormError message={state.error} /> : null}
          <input type="hidden" name="casetaId" value={casetaId} />
          <input type="hidden" name="productoId" value={productoId} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cantidad actual</Label>
              <div className="mt-1 font-mono text-lg">
                {cantidadActual} {unidad}
              </div>
            </div>
            <div>
              <Label htmlFor="nuevaCantidad">Nueva cantidad</Label>
              <Input
                id="nuevaCantidad"
                name="nuevaCantidad"
                type="number"
                step="0.001"
                min="0"
                value={nuevaCantidad}
                onChange={(e) => setNuevaCantidad(e.target.value)}
                required
              />
              <FieldError messages={errors.nuevaCantidad} />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Diferencia: </span>
            <span
              className={
                diferencia === 0
                  ? "font-mono"
                  : diferencia > 0
                    ? "font-mono text-primary"
                    : "font-mono text-destructive-foreground"
              }
            >
              {diferencia > 0 ? "+" : ""}
              {diferencia} {unidad}
            </span>
          </div>

          <div>
            <Label htmlFor="nota">Nota (opcional)</Label>
            <Input
              id="nota"
              name="nota"
              placeholder="Motivo del ajuste…"
            />
            <FieldError messages={errors.nota} />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={pending || diferencia === 0}>
              {pending ? "Guardando…" : "Guardar ajuste"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
