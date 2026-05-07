"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/action-result";
import {
  bloquearCierreAction,
  desbloquearCierreAction,
  eliminarCierreAction,
} from "../actions";

export function BotonBloquear({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    bloquearCierreAction,
    null
  );
  const errorMsg = state && !state.ok ? state.error : null;

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={formAction}>
        <input type="hidden" name="_id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
        >
          Bloquear
        </button>
      </form>
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
    </div>
  );
}

export function BotonDesbloquear({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    desbloquearCierreAction,
    null
  );
  const errorMsg = state && !state.ok ? state.error : null;

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={formAction}>
        <input type="hidden" name="_id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
        >
          Desbloquear
        </button>
      </form>
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
    </div>
  );
}

export function BotonEliminar({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    eliminarCierreAction,
    null
  );
  const errorMsg = state && !state.ok ? state.error : null;

  return (
    <div className="flex flex-col items-start gap-1">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm("¿Eliminar este cierre? No se puede deshacer.")) {
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
