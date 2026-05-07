"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "../../_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import { crearEntidadAction, renombrarEntidadAction } from "../actions";

export function CrearEntidadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(async (prev, formData) => {
    const result = await crearEntidadAction(prev, formData);
    if (result.ok) formRef.current?.reset();
    return result;
  }, null);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 max-w-md"
    >
      {state && !state.ok ? <FormError message={state.error} /> : null}

      <div>
        <Label htmlFor="nombre">Nombre de la entidad</Label>
        <Input
          id="nombre"
          name="nombre"
          placeholder="Peña Los Madriles"
          required
          maxLength={80}
        />
        <FieldError messages={errors.nombre} />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Crear entidad"}
        </Button>
      </div>
    </form>
  );
}

export function RenombrarEntidadForm({
  id,
  nombreActual,
}: {
  id: string;
  nombreActual: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(async (prev, formData) => {
    const result = await renombrarEntidadAction(prev, formData);
    if (result.ok) setEditing(false);
    return result;
  }, null);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-left hover:underline"
        title="Click para renombrar"
      >
        {nombreActual}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-start gap-2">
      <input type="hidden" name="_id" value={id} />
      <div className="flex-1">
        <Input
          name="nombre"
          defaultValue={nombreActual}
          autoFocus
          required
          maxLength={80}
          className="h-8"
        />
        <FieldError messages={errors.nombre} />
        {state && !state.ok && !errors.nombre ? (
          <p className="text-xs text-destructive-foreground mt-1">{state.error}</p>
        ) : null}
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Guardar"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setEditing(false)}
        disabled={pending}
      >
        Cancelar
      </Button>
    </form>
  );
}
