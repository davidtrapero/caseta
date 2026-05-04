"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "../../_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import {
  crearCasetaAction,
  actualizarCasetaAction,
} from "../actions";

type Modo = "crear" | "editar";

type CasetaFormProps = {
  modo: Modo;
  initial?: {
    id: string;
    nombre: string;
    ubicacion: string | null;
    activa: boolean;
  };
};

export function CasetaForm({ modo, initial }: CasetaFormProps) {
  const action = modo === "crear" ? crearCasetaAction : actualizarCasetaAction;
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

      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          defaultValue={initial?.nombre ?? ""}
          placeholder="Caseta El Rocío"
          required
        />
        <FieldError messages={errors.nombre} />
      </div>

      <div>
        <Label htmlFor="ubicacion">Ubicación</Label>
        <Input
          id="ubicacion"
          name="ubicacion"
          defaultValue={initial?.ubicacion ?? ""}
          placeholder="Calle Infierno, nº 12"
        />
        <FieldError messages={errors.ubicacion} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="activa"
          defaultChecked={initial?.activa ?? true}
          className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
        />
        <span>Caseta activa (disponible para turnos, cierres y pedidos).</span>
      </label>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : modo === "crear" ? "Crear caseta" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/casetas">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
