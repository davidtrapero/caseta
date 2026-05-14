"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "../../../admin/_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import { cambiarPasswordInicialAction } from "../actions";

export function FormPasswordInicial() {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ ok: true }> | null,
    FormData
  >(cambiarPasswordInicialAction, null);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? <FormError message={state.error} /> : null}

      <div>
        <Label htmlFor="newPassword">Nueva contraseña</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <FieldError messages={errors.newPassword} />
      </div>

      <div>
        <Label htmlFor="repetirPassword">Repetir nueva contraseña</Label>
        <Input
          id="repetirPassword"
          name="repetirPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <FieldError messages={errors.repetirPassword} />
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Establecer contraseña"}
        </Button>
      </div>
    </form>
  );
}
