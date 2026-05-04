"use client";

import * as React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import type { ActionResult } from "@/lib/action-result";
import { duplicarSemanaAction } from "../actions";
import { addDays, fromIsoDate, toIsoDate } from "../_lib/fechas";
import { Copy } from "lucide-react";

export function BotonDuplicarSemana({
  casetaId,
  edicionId,
  lunesIso,
  disabled,
}: {
  casetaId: string;
  edicionId: string;
  lunesIso: string;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ copiados: number }> | null,
    FormData
  >(duplicarSemanaAction, null);

  const lunesDestino = lunesIso;
  const lunesOrigen = toIsoDate(addDays(fromIsoDate(lunesIso), -7));

  React.useEffect(() => {
    if (state?.ok) {
      toast.show(`Duplicados ${state.data.copiados} turnos de la semana anterior.`, "success");
    } else if (state && !state.ok) {
      toast.show(state.error, "error");
    }
  }, [state, toast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="casetaId" value={casetaId} />
      <input type="hidden" name="edicionId" value={edicionId} />
      <input type="hidden" name="lunesOrigen" value={lunesOrigen} />
      <input type="hidden" name="lunesDestino" value={lunesDestino} />
      <Button type="submit" variant="outline" size="sm" disabled={disabled || pending}>
        <Copy className="h-4 w-4" />
        {pending ? "Duplicando…" : "Duplicar semana anterior"}
      </Button>
    </form>
  );
}
