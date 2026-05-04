"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import type { ActionResult } from "@/lib/action-result";
import { recibirPedidoAction, cancelarPedidoAction } from "../actions";

export function BotonRecibir({ id }: { id: string }) {
  const [state, action, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(recibirPedidoAction, null);

  const { show } = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state && state !== last.current) {
      last.current = state;
      if (state.ok) {
        show("Pedido recibido. Stock actualizado.", "success");
      } else {
        show(state.error, "error");
      }
    }
  }, [state, show]);

  return (
    <form action={action}>
      <input type="hidden" name="_id" value={id} />
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        onClick={(e) => {
          if (!confirm("¿Marcar pedido como recibido? Esto actualizará el stock y no se puede deshacer.")) {
            e.preventDefault();
          }
        }}
      >
        {pending ? "Recibiendo…" : "Marcar recibido"}
      </Button>
    </form>
  );
}

export function BotonCancelar({ id }: { id: string }) {
  const [state, action, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(cancelarPedidoAction, null);

  const { show } = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state && state !== last.current) {
      last.current = state;
      if (state.ok) {
        show("Pedido cancelado.", "success");
      } else {
        show(state.error, "error");
      }
    }
  }, [state, show]);

  return (
    <form action={action}>
      <input type="hidden" name="_id" value={id} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={(e) => {
          if (!confirm("¿Cancelar este pedido?")) {
            e.preventDefault();
          }
        }}
      >
        {pending ? "Cancelando…" : "Cancelar"}
      </Button>
    </form>
  );
}
