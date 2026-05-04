"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FieldError,
  FormError,
} from "../../../admin/_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import {
  crearCierreAction,
  actualizarCierreAction,
} from "../actions";

type Modo = "crear" | "editar";

type CasetaOpcion = { id: string; nombre: string };

type CierreFormProps = {
  modo: Modo;
  casetas: CasetaOpcion[];
  initial?: {
    id: string;
    casetaId: string;
    fecha: string; // YYYY-MM-DD
    ingresosTotales: string;
    notas: string | null;
    bloqueado: boolean;
  };
  soloLectura?: boolean;
};

export function CierreForm({ modo, casetas, initial, soloLectura }: CierreFormProps) {
  const action = modo === "crear" ? crearCierreAction : actualizarCierreAction;
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

      {initial?.bloqueado ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          Cierre bloqueado. Solo admin puede modificarlo.
        </div>
      ) : null}

      <div>
        <Label htmlFor="casetaId">Caseta</Label>
        <select
          id="casetaId"
          name="casetaId"
          required
          disabled={soloLectura}
          defaultValue={initial?.casetaId ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>
            Selecciona caseta…
          </option>
          {casetas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <FieldError messages={errors.casetaId} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fecha">Fecha</Label>
          <Input
            id="fecha"
            name="fecha"
            type="date"
            required
            disabled={soloLectura}
            defaultValue={initial?.fecha ?? ""}
          />
          <FieldError messages={errors.fecha} />
        </div>
        <div>
          <Label htmlFor="ingresosTotales">Ingresos totales (€)</Label>
          <Input
            id="ingresosTotales"
            name="ingresosTotales"
            type="number"
            step="0.01"
            min="0"
            required
            disabled={soloLectura}
            defaultValue={initial?.ingresosTotales ?? ""}
            placeholder="1234.56"
            className="font-mono"
          />
          <FieldError messages={errors.ingresosTotales} />
        </div>
      </div>

      <div>
        <Label htmlFor="notas">Notas</Label>
        <textarea
          id="notas"
          name="notas"
          disabled={soloLectura}
          defaultValue={initial?.notas ?? ""}
          rows={3}
          placeholder="Observaciones del día (opcional)"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        />
        <FieldError messages={errors.notas} />
      </div>

      <div className="flex items-center gap-2 pt-2">
        {!soloLectura ? (
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : modo === "crear" ? "Crear cierre" : "Guardar cambios"}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" asChild>
          <Link href="/caja/cierres">Volver</Link>
        </Button>
      </div>
    </form>
  );
}
