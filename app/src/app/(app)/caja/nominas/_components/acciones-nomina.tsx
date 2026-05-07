"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/action-result";
import { marcarPagadaAction, desmarcarPagadaAction } from "../actions";

export function BotonMarcarPagada({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    marcarPagadaAction,
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
          Marcar pagada
        </button>
      </form>
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
    </div>
  );
}

export function BotonDesmarcarPagada({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    desmarcarPagadaAction,
    null
  );
  const errorMsg = state && !state.ok ? state.error : null;

  return (
    <div className="flex flex-col items-start gap-1">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm("¿Desmarcar esta nómina como pagada?")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="_id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
        >
          Desmarcar
        </button>
      </form>
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
    </div>
  );
}
