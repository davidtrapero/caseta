"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ActionResult } from "@/lib/action-result";
import { toggleActivoProveedorAction } from "../actions";

export function ToggleActivoProveedorForm({
  id,
  activo,
  disabled,
}: {
  id: string;
  activo: boolean;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ activo: boolean }> | null,
    FormData
  >(toggleActivoProveedorAction, null);

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
            : activo
              ? "Marcar como inactivo"
              : "Marcar como activo"
        }
      >
        <Badge variant={activo ? "active" : "inactive"}>
          {activo ? "Activo" : "Inactivo"}
        </Badge>
      </button>
      {errorMsg ? (
        <span className="text-xs text-destructive">{errorMsg}</span>
      ) : null}
    </form>
  );
}
