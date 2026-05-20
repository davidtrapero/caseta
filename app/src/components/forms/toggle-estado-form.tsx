"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ActionResult } from "@/lib/action-result";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToggleAction = (prev: any, formData: FormData) => Promise<ActionResult<any> | null>;

export function ToggleEstadoForm({
  id,
  activo,
  action,
  labels,
  titles,
  disabled,
}: {
  id: string;
  activo: boolean;
  /** Una action única, o un par {whenActive, whenInactive} elegido según el estado actual. */
  action: ToggleAction | { whenActive: ToggleAction; whenInactive: ToggleAction };
  /** Texto del badge en cada estado: ej. {activo: "Activo", inactivo: "Inactivo"} o "Activa/Inactiva". */
  labels: { activo: string; inactivo: string };
  /** Títulos hover-tooltip. */
  titles: {
    /** Cuando el botón está deshabilitado externamente (sin permisos). */
    disabled?: string;
    /** Cuando el estado actual es activo (acción: desactivar). */
    whenActive: string;
    /** Cuando el estado actual es inactivo (acción: activar). */
    whenInactive: string;
  };
  disabled?: boolean;
}) {
  const resolvedAction =
    typeof action === "function"
      ? action
      : activo
        ? action.whenActive
        : action.whenInactive;

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    resolvedAction,
    null
  );

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
            ? titles.disabled ?? "No tienes permisos para cambiar este estado"
            : activo
              ? titles.whenActive
              : titles.whenInactive
        }
      >
        <Badge variant={activo ? "active" : "inactive"}>
          {activo ? labels.activo : labels.inactivo}
        </Badge>
      </button>
      {errorMsg ? <span className="text-xs text-destructive">{errorMsg}</span> : null}
    </form>
  );
}
