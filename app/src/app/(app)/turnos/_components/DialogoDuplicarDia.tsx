"use client";

import * as React from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { duplicarDiaAction } from "../actions";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/toaster";
import { FormError } from "../../admin/_components/page-header";

type Props = {
  open: boolean;
  onClose: () => void;
  casetaId: string;
  edicionId: string;
  diaOrigen: string; // fecha mostrada actualmente (sería destino si se duplica DE ella)
  /** Si true: el diálogo permite elegir día origen, y destino = día actual. */
  duplicarDesdeAnterior?: boolean;
  diaAnterior?: string;
};

export function DialogoDuplicarDia({
  open,
  onClose,
  casetaId,
  edicionId,
  diaOrigen,
  duplicarDesdeAnterior = false,
  diaAnterior,
}: Props) {
  // Modo más común: copiar el día anterior AL día mostrado actualmente.
  const [origen, setOrigen] = useState(
    duplicarDesdeAnterior ? diaAnterior ?? diaOrigen : diaOrigen
  );
  const [destino, setDestino] = useState(duplicarDesdeAnterior ? diaOrigen : "");

  const [state, action, pending] = useActionState<
    ActionResult<{ copiados: number }> | null,
    FormData
  >(duplicarDiaAction, null);

  const { show } = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state && state !== last.current) {
      last.current = state;
      if (state.ok) {
        show(`${state.data.copiados} turnos copiados`, "success");
        onClose();
      } else show(state.error, "error");
    }
  }, [state, show, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Duplicar día">
      <form action={action} className="flex flex-col gap-4">
        {state && !state.ok ? <FormError message={state.error} /> : null}
        <input type="hidden" name="casetaId" value={casetaId} />
        <input type="hidden" name="edicionId" value={edicionId} />

        <div>
          <Label htmlFor="diaOrigen">Día origen</Label>
          <Input
            id="diaOrigen"
            name="diaOrigen"
            type="date"
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="diaDestino">Día destino</Label>
          <Input
            id="diaDestino"
            name="diaDestino"
            type="date"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            required
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            id="copiarAsignaciones"
            name="copiarAsignaciones"
            type="checkbox"
            className="mt-1"
          />
          <div className="flex flex-col">
            <Label htmlFor="copiarAsignaciones" className="font-normal">
              Copiar también asignaciones de empleados
            </Label>
            <span className="text-xs text-muted-foreground">
              Si lo dejas desmarcado se copian solo los turnos y sus plazas, sin
              asignar empleados.
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Si hay solapes con turnos existentes, la operación se aborta.
        </p>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Duplicando…" : "Duplicar"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
