"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "../../_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import {
  crearEdicionAction,
  actualizarEdicionAction,
} from "../actions";

type Modo = "crear" | "editar";

type EdicionFormProps = {
  modo: Modo;
  initial?: {
    id: string;
    anio: number;
    nombre: string;
    fechaInicio: string; // ISO date (yyyy-mm-dd)
    fechaFin: string;
    activa: boolean;
  };
};

function toDateInput(d: string) {
  return d.slice(0, 10);
}

export function EdicionForm({ modo, initial }: EdicionFormProps) {
  const action = modo === "crear" ? crearEdicionAction : actualizarEdicionAction;
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? <FormError message={state.error} /> : null}

      {modo === "editar" && initial ? (
        <input type="hidden" name="_id" value={initial.id} />
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="anio">Año</Label>
          <Input
            id="anio"
            name="anio"
            type="number"
            inputMode="numeric"
            defaultValue={initial?.anio ?? new Date().getFullYear()}
            required
          />
          <FieldError messages={errors.anio} />
        </div>
        <div>
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            defaultValue={initial?.nombre ?? ""}
            placeholder="Feria 2026"
            required
          />
          <FieldError messages={errors.nombre} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fechaInicio">Fecha de inicio</Label>
          <Input
            id="fechaInicio"
            name="fechaInicio"
            type="date"
            defaultValue={initial ? toDateInput(initial.fechaInicio) : ""}
            required
          />
          <FieldError messages={errors.fechaInicio} />
        </div>
        <div>
          <Label htmlFor="fechaFin">Fecha de fin</Label>
          <Input
            id="fechaFin"
            name="fechaFin"
            type="date"
            defaultValue={initial ? toDateInput(initial.fechaFin) : ""}
            required
          />
          <FieldError messages={errors.fechaFin} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="activa"
          defaultChecked={initial?.activa ?? false}
          className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
        />
        <span>Marcar como edición activa (visible por defecto en selectores).</span>
      </label>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : modo === "crear" ? "Crear edición" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/ediciones">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
