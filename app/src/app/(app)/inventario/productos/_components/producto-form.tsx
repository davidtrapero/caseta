"use client";

import { useActionState, useState } from "react";
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
    casetaIds: string[];
    nombre: string;
    unidad: string;
    activo: boolean;
  };
  casetaPorDefecto?: string;
};

function parseValsCasetaIds(raw: unknown): string[] | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : null;
  } catch {
    return null;
  }
}

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
  const vals = state && !state.ok ? state.values ?? {} : {};

  const idsIniciales =
    parseValsCasetaIds(vals.casetaIds) ??
    initial?.casetaIds ??
    (casetaPorDefecto ? [casetaPorDefecto] : []);

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(
    () => new Set(idsIniciales)
  );

  const toggle = (id: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? <FormError message={state.error} /> : null}

      {modo === "editar" && initial ? (
        <input type="hidden" name="_id" value={initial.id} />
      ) : null}

      <input
        type="hidden"
        name="casetaIds"
        value={JSON.stringify([...seleccionadas])}
      />

      <div>
        <Label>Casetas disponibles</Label>
        <div className="mt-1 flex flex-col gap-1.5 rounded-md border border-input p-3">
          {casetas.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={seleccionadas.has(c.id)}
                onChange={() => toggle(c.id)}
                className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
              />
              <span>{c.nombre}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Marca todas las casetas donde se vende este producto. El stock se gestiona por caseta de forma independiente.
        </p>
        <FieldError messages={errors.casetaIds} />
      </div>

      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          defaultValue={(vals.nombre as string | undefined) ?? initial?.nombre ?? ""}
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
          defaultValue={(vals.unidad as string | undefined) ?? initial?.unidad ?? "unidad"}
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
          defaultChecked={vals.activo !== undefined ? (vals.activo as string) === "on" : (initial?.activo ?? true)}
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
