"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "../../../admin/_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import {
  crearProductoAction,
  actualizarProductoAction,
} from "../actions";

type Modo = "crear" | "editar";

type CasetaMin = { id: string; nombre: string };

type ProductoFormProps = {
  modo: Modo;
  casetas: CasetaMin[];
  initial?: {
    id: string;
    casetaId: string;
    nombre: string;
    unidad: string;
    activo: boolean;
  };
  casetaPorDefecto?: string;
};

export function ProductoForm({
  modo,
  casetas,
  initial,
  casetaPorDefecto,
}: ProductoFormProps) {
  const action = modo === "crear" ? crearProductoAction : actualizarProductoAction;
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
        <Label htmlFor="casetaId">Caseta</Label>
        <select
          id="casetaId"
          name="casetaId"
          defaultValue={initial?.casetaId ?? casetaPorDefecto ?? ""}
          required
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="" disabled>
            Selecciona una caseta
          </option>
          {casetas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <FieldError messages={errors.casetaId} />
      </div>

      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          defaultValue={initial?.nombre ?? ""}
          placeholder="Rebujito, cerveza, jamón..."
          required
        />
        <FieldError messages={errors.nombre} />
      </div>

      <div>
        <Label htmlFor="unidad">Unidad</Label>
        <Input
          id="unidad"
          name="unidad"
          defaultValue={initial?.unidad ?? "unidad"}
          placeholder="unidad, botella, kg, litro..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Cómo se mide el stock (ej. botella, kg, litro).
        </p>
        <FieldError messages={errors.unidad} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="activo"
          defaultChecked={initial?.activo ?? true}
          className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
        />
        <span>Producto activo (disponible para stock y pedidos).</span>
      </label>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Guardando…"
            : modo === "crear"
              ? "Crear producto"
              : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/inventario/productos">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
