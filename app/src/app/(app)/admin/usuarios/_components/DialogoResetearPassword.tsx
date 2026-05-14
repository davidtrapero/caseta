"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toaster";
import { FieldError, FormError } from "../../_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import { resetearPasswordAction } from "../actions";

type Props = {
  userId: string;
  userName: string;
};

export function DialogoResetearPassword({ userId, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(resetearPasswordAction, null);
  const { show } = useToast();
  const last = useRef<typeof state>(null);

  // Cuando la action devuelve un nuevo state distinto al previo, mostramos
  // el toast y, en éxito, cerramos el dialog. queueMicrotask evita el
  // setState síncrono dentro del effect (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (state && state !== last.current) {
      last.current = state;
      if (state.ok) {
        show(
          "Contraseña reseteada. El usuario deberá cambiarla en su próximo login.",
          "success"
        );
        queueMicrotask(() => setOpen(false));
      } else {
        show(state.error, "error");
      }
    }
  }, [state, show]);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        Resetear contraseña
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Resetear contraseña"
        description={`Establece una contraseña temporal para ${userName}. Se le forzará a cambiarla en su próximo acceso.`}
      >
        <form action={formAction} className="flex flex-col gap-4">
          {state && !state.ok ? <FormError message={state.error} /> : null}
          <input type="hidden" name="userId" value={userId} />

          <div>
            <Label htmlFor={`nuevaPassword-${userId}`}>Nueva contraseña</Label>
            <Input
              id={`nuevaPassword-${userId}`}
              name="nuevaPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="Mínimo 8 caracteres"
            />
            <FieldError messages={errors.nuevaPassword} />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Reseteando…" : "Resetear contraseña"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
