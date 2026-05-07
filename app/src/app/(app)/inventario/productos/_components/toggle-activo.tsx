"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ActionResult } from "@/lib/action-result";
import { toggleActivoProductoAction } from "../actions";

export function ToggleActivoProductoForm({
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
  >(toggleActivoProductoAction, null);

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
            ? "Necesitas rol admin o gerente"
            : activo
              ? "Desactivar producto"
              : "Reactivar producto"
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
