"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ActionResult } from "@/lib/action-result";
import {
  desactivarUsuarioAction,
  reactivarUsuarioAction,
} from "../actions";

export function ToggleActivoUsuarioForm({
  id,
  activo,
  disabled,
  esSelf,
}: {
  id: string;
  activo: boolean;
  disabled?: boolean;
  esSelf?: boolean;
}) {
  const action = activo ? desactivarUsuarioAction : reactivarUsuarioAction;
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const errorMsg = state && !state.ok ? state.error : null;
  const bloqueado = disabled || esSelf || pending;

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        disabled={bloqueado}
        className="group inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        title={
          esSelf
            ? "No puedes desactivarte a ti misma"
            : disabled
              ? "Solo la administración puede cambiar este estado"
              : activo
                ? "Desactivar cuenta"
                : "Reactivar cuenta"
        }
      >
        <Badge variant={activo ? "active" : "inactive"}>
          {activo ? "Activo" : "Inactivo"}
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
