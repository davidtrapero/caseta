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
import { PERFIL_ORDEN, PERFIL_LABEL } from "../../../turnos/_lib/perfiles";

type Modo = "crear" | "editar";

type CasetaFormProps = {
  modo: Modo;
  initial?: {
    id: string;
    nombre: string;
    ubicacion: string | null;
    activa: boolean;
    jornalDiarioDefault: string | null;
    perfilDefecto: string | null;
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
          placeholder="Caseta La Pradera"
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="jornalDiarioDefault">Jornal diario por defecto (€)</Label>
          <Input
            id="jornalDiarioDefault"
            name="jornalDiarioDefault"
            type="number"
            step="0.01"
            min="0"
            max="9999.99"
            defaultValue={initial?.jornalDiarioDefault ?? ""}
            placeholder="80.00"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Se precargará al crear un empleado desde esta caseta.
          </p>
          <FieldError messages={errors.jornalDiarioDefault} />
        </div>
        <div>
          <Label htmlFor="perfilDefecto">Perfil por defecto</Label>
          <select
            id="perfilDefecto"
            name="perfilDefecto"
            defaultValue={initial?.perfilDefecto ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Sin defecto —</option>
            {PERFIL_ORDEN.map((p) => (
              <option key={p} value={p}>
                {PERFIL_LABEL[p]}
              </option>
            ))}
          </select>
          <FieldError messages={errors.perfilDefecto} />
        </div>
      </div>

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
