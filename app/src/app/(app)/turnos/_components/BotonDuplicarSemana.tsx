"use client";

import * as React from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { duplicarSemanaAction } from "../actions";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/toaster";
import { addDays } from "../_lib/fechas";
import { FormError } from "../../admin/_components/page-header";

type Props = {
  casetaId: string;
  edicionId: string;
  lunesActual: string;
  casetas: { id: string; nombre: string }[];
};

export function BotonDuplicarSemana({
  casetaId,
  edicionId,
  lunesActual,
  casetas,
}: Props) {
  const [open, setOpen] = useState(false);
  const [destino, setDestino] = useState(addDays(lunesActual, 7));
  const [casetaOrigen, setCasetaOrigen] = useState(casetaId);
  const [copiarAsig, setCopiarAsig] = useState(false);

  const [state, action, pending] = useActionState<
    ActionResult<{ copiados: number }> | null,
    FormData
  >(duplicarSemanaAction, null);

  const { show } = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state && state !== last.current) {
      last.current = state;
      if (state.ok) {
        show(`${state.data.copiados} turnos copiados`, "success");
        // queueMicrotask: evita setState síncrono en effect (react-hooks/set-state-in-effect)
        queueMicrotask(() => setOpen(false));
      } else show(state.error, "error");
    }
  }, [state, show]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Copy className="h-4 w-4" /> Duplicar semana
      </Button>
      {open ? (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Duplicar semana completa"
          description="Se copian todos los turnos de la semana mostrada a la semana destino."
        >
          <form action={action} className="flex flex-col gap-4">
            {state && !state.ok ? <FormError message={state.error} /> : null}
            <input type="hidden" name="casetaId" value={casetaId} />
            <input type="hidden" name="casetaIdOrigen" value={casetaOrigen} />
            <input type="hidden" name="edicionId" value={edicionId} />
            <input type="hidden" name="lunesOrigen" value={lunesActual} />

            <div>
              <Label htmlFor="casetaIdOrigenSelSem">Copiar desde la caseta…</Label>
              <select
                id="casetaIdOrigenSelSem"
                value={casetaOrigen}
                onChange={(e) => setCasetaOrigen(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {casetas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {c.id === casetaId ? " (esta caseta)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="lunesDestino">Lunes de la semana destino</Label>
              <Input
                id="lunesDestino"
                name="lunesDestino"
                type="date"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se copiarán 7 días desde el lunes indicado.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <input
                id="copiarAsignaciones"
                name="copiarAsignaciones"
                type="checkbox"
                className="mt-1"
                checked={copiarAsig}
                onChange={(e) => setCopiarAsig(e.target.checked)}
              />
              <div className="flex flex-col">
                <Label htmlFor="copiarAsignaciones" className="font-normal">
                  Copiar también asignaciones de personal
                </Label>
                <span className="text-xs text-muted-foreground">
                  Si lo dejas desmarcado se copian solo los turnos y sus plazas,
                  sin asignar personal.
                </span>
              </div>
            </div>

            {casetaOrigen !== casetaId && copiarAsig ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Las asignaciones se replicarán; revisa que el personal siga
                dado de alta para la caseta destino.
              </p>
            ) : null}

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Duplicando…" : "Duplicar"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
