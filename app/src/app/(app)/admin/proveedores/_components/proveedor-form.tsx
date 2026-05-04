"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "../../_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import {
  crearProveedorAction,
  actualizarProveedorAction,
} from "../actions";

type Modo = "crear" | "editar";

type ProveedorFormProps = {
  modo: Modo;
  initial?: {
    id: string;
    nombre: string;
    contacto: string | null;
    email: string | null;
    telefono: string | null;
    activo: boolean;
  };
};

export function ProveedorForm({ modo, initial }: ProveedorFormProps) {
  const action = modo === "crear" ? crearProveedorAction : actualizarProveedorAction;
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
          placeholder="Bebidas González S.L."
          required
        />
        <FieldError messages={errors.nombre} />
      </div>

      <div>
        <Label htmlFor="contacto">Persona de contacto</Label>
        <Input
          id="contacto"
          name="contacto"
          defaultValue={initial?.contacto ?? ""}
          placeholder="María López"
        />
        <FieldError messages={errors.contacto} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            placeholder="pedidos@proveedor.com"
          />
          <FieldError messages={errors.email} />
        </div>
        <div>
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            name="telefono"
            defaultValue={initial?.telefono ?? ""}
            placeholder="955 123 456"
          />
          <FieldError messages={errors.telefono} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="activo"
          defaultChecked={initial?.activo ?? true}
          className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
        />
        <span>Proveedor activo (disponible para pedidos).</span>
      </label>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : modo === "crear" ? "Crear proveedor" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/proveedores">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
