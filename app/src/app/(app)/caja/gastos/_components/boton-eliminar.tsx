"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/action-result";
import { eliminarGastoAction } from "../actions";

export function BotonEliminarGasto({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    eliminarGastoAction,
    null
  );
  const errorMsg = state && !state.ok ? state.error : null;

  return (
    <div className="flex flex-col items-start gap-1">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm("¿Eliminar este gasto? No se puede deshacer.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="_id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-destructive-foreground hover:underline disabled:opacity-60"
        >
          Eliminar
        </button>
      </form>
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
    </div>
  );
}
