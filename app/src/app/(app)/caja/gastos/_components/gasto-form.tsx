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
import { crearGastoAction, actualizarGastoAction } from "../actions";
import { CATEGORIAS_GASTO, CATEGORIA_LABEL } from "../_lib/categorias";

type Modo = "crear" | "editar";

type CasetaOpcion = { id: string; nombre: string };

type GastoFormProps = {
  modo: Modo;
  casetas: CasetaOpcion[];
  initial?: {
    id: string;
    descripcion: string;
    monto: string;
    categoria: string;
    fecha: string;
    casetaId: string | null;
  };
};

export function GastoForm({ modo, casetas, initial }: GastoFormProps) {
  const action = modo === "crear" ? crearGastoAction : actualizarGastoAction;
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const vals = state && !state.ok ? state.values ?? {} : {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? <FormError message={state.error} /> : null}

      {modo === "editar" && initial ? (
        <input type="hidden" name="_id" value={initial.id} />
      ) : null}

      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Input
          id="descripcion"
          name="descripcion"
          required
          defaultValue={(vals.descripcion as string | undefined) ?? initial?.descripcion ?? ""}
          placeholder="Compra de hielo, alquiler frigorífico…"
          maxLength={300}
        />
        <FieldError messages={errors.descripcion} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="monto">Monto (€)</Label>
          <Input
            id="monto"
            name="monto"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={(vals.monto as string | undefined) ?? initial?.monto ?? ""}
            placeholder="12.50"
            className="font-mono"
          />
          <FieldError messages={errors.monto} />
        </div>
        <div>
          <Label htmlFor="fecha">Fecha</Label>
          <Input
            id="fecha"
            name="fecha"
            type="date"
            required
            defaultValue={(vals.fecha as string | undefined) ?? initial?.fecha ?? ""}
          />
          <FieldError messages={errors.fecha} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="categoria">Categoría</Label>
          <select
            id="categoria"
            name="categoria"
            required
            defaultValue={(vals.categoria as string | undefined) ?? initial?.categoria ?? "compras"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            {CATEGORIAS_GASTO.map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_LABEL[c]}
              </option>
            ))}
          </select>
          <FieldError messages={errors.categoria} />
        </div>
        <div>
          <Label htmlFor="casetaId">Caseta</Label>
          <select
            id="casetaId"
            name="casetaId"
            defaultValue={(vals.casetaId as string | undefined) ?? initial?.casetaId ?? "__central__"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            <option value="__central__">— Gasto centralizado —</option>
            {casetas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <FieldError messages={errors.casetaId} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : modo === "crear" ? "Crear gasto" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/caja/gastos">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
