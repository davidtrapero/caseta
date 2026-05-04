"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ActionResult } from "@/lib/action-result";
import { toggleActivaCasetaAction } from "../actions";

export function ToggleActivaCasetaForm({
  id,
  activa,
  disabled,
}: {
  id: string;
  activa: boolean;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ activa: boolean }> | null,
    FormData
  >(toggleActivaCasetaAction, null);

  const errorMsg = state && !state.ok ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        disabled={disabled || pending}
        className="group inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        title={
          disabled
            ? "Necesitas rol admin o gerente para cambiar este estado"
            : activa
              ? "Marcar como inactiva"
              : "Marcar como activa"
        }
      >
        <Badge variant={activa ? "active" : "inactive"}>
          {activa ? "Activa" : "Inactiva"}
        </Badge>
      </button>
      {errorMsg ? (
        <span className="text-xs text-destructive-foreground bg-destructive/90 rounded-sm px-2 py-1">
          {errorMsg}
        </span>
      ) : null}
    </form>
  );
}
