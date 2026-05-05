"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { aprobarSolicitudAction, rechazarSolicitudAction } from "../actions";

export function AccionesSolicitud({ solicitudId }: { solicitudId: string }) {
  const [aprobarState, aprobarAction, aprobarPending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(aprobarSolicitudAction, null);

  const [rechazarState, rechazarAction, rechazarPending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(rechazarSolicitudAction, null);

  const error =
    (aprobarState && !aprobarState.ok ? aprobarState.error : null) ||
    (rechazarState && !rechazarState.ok ? rechazarState.error : null);

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-2">
        <form action={aprobarAction}>
          <input type="hidden" name="solicitudId" value={solicitudId} />
          <Button type="submit" size="sm" disabled={aprobarPending || rechazarPending}>
            {aprobarPending ? "Aprobando…" : "Aprobar"}
          </Button>
        </form>
        <form
          action={rechazarAction}
          onSubmit={(e) => {
            if (!confirm("¿Rechazar esta solicitud?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="solicitudId" value={solicitudId} />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={aprobarPending || rechazarPending}
          >
            {rechazarPending ? "…" : "Rechazar"}
          </Button>
        </form>
      </div>
      {error ? (
        <p className="text-xs text-destructive-foreground bg-destructive/90 rounded-sm px-2 py-1">
          {error}
        </p>
      ) : null}
    </div>
  );
}
