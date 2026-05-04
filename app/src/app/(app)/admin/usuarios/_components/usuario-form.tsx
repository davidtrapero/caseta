"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "../../_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import {
  crearUsuarioAction,
  actualizarUsuarioAction,
} from "../actions";

type Modo = "crear" | "editar";
type Rol = "admin" | "gerente" | "cajero";

type UsuarioFormProps = {
  modo: Modo;
  initial?: {
    id: string;
    email: string;
    name: string;
    rol: Rol;
    activo: boolean;
  };
  esAutoedicion?: boolean;
};

export function UsuarioForm({ modo, initial, esAutoedicion = false }: UsuarioFormProps) {
  const action = modo === "crear" ? crearUsuarioAction : actualizarUsuarioAction;
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={initial?.email ?? ""}
          placeholder="usuario@caseta.local"
          required={modo === "crear"}
          disabled={modo === "editar"}
          readOnly={modo === "editar"}
        />
        {modo === "editar" ? (
          <p className="text-xs text-muted-foreground mt-1">
            El email no se puede cambiar desde aquí.
          </p>
        ) : null}
        <FieldError messages={errors.email} />
      </div>

      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name ?? ""}
          placeholder="Juan Pérez"
          required
        />
        <FieldError messages={errors.name} />
      </div>

      {modo === "crear" ? (
        <div>
          <Label htmlFor="password">Contraseña inicial</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="Mínimo 8 caracteres"
          />
          <p className="text-xs text-muted-foreground mt-1">
            El usuario podrá cambiarla después.
          </p>
          <FieldError messages={errors.password} />
        </div>
      ) : null}

      <div>
        <Label htmlFor="rol">Rol</Label>
        <select
          id="rol"
          name="rol"
          defaultValue={initial?.rol ?? "cajero"}
          disabled={esAutoedicion}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          required
        >
          <option value="admin">Admin — acceso total</option>
          <option value="gerente">Gerente — operativa diaria</option>
          <option value="cajero">Cajero — cierres y gastos</option>
        </select>
        {esAutoedicion ? (
          <p className="text-xs text-muted-foreground mt-1">
            No puedes cambiar tu propio rol.
          </p>
        ) : null}
        <FieldError messages={errors.rol} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="activo"
          defaultChecked={initial?.activo ?? true}
          disabled={esAutoedicion}
          className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span>Usuario activo (puede iniciar sesión).</span>
      </label>
      {esAutoedicion ? (
        <p className="text-xs text-muted-foreground -mt-2">
          No puedes desactivarte a ti mismo.
        </p>
      ) : null}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : modo === "crear" ? "Crear usuario" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/usuarios">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
