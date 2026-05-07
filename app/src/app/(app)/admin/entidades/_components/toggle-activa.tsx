"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ActionResult } from "@/lib/action-result";
import { desactivarEntidadAction, reactivarEntidadAction } from "../actions";

export function ToggleActivaEntidadForm({
  id,
  activa,
}: {
  id: string;
  activa: boolean;
}) {
  const action = activa ? desactivarEntidadAction : reactivarEntidadAction;

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    action,
    null
  );

  const errorMsg = state && !state.ok ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="group inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        title={activa ? "Marcar como inactiva (no aparece en formularios públicos)" : "Reactivar entidad"}
      >
        <Badge variant={activa ? "active" : "inactive"}>
          {activa ? "Activa" : "Inactiva"}
        </Badge>
      </button>
      {errorMsg ? (
        <span className="text-xs text-destructive">{errorMsg}</span>
      ) : null}
    </form>
  );
}
