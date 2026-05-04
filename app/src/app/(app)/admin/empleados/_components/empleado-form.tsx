"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "../../_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import {
  crearEmpleadoAction,
  actualizarEmpleadoAction,
} from "../actions";

type Modo = "crear" | "editar";

type EmpleadoFormProps = {
  modo: Modo;
  initial?: {
    id: string;
    nombre: string;
    dni: string | null;
    telefono: string | null;
    jornalDiario: string | null; // Decimal serializado como string
    activo: boolean;
  };
};

export function EmpleadoForm({ modo, initial }: EmpleadoFormProps) {
  const action = modo === "crear" ? crearEmpleadoAction : actualizarEmpleadoAction;
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
          placeholder="Juan Pérez"
          required
        />
        <FieldError messages={errors.nombre} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dni">DNI / NIE</Label>
          <Input
            id="dni"
            name="dni"
            defaultValue={initial?.dni ?? ""}
            placeholder="12345678A"
          />
          <FieldError messages={errors.dni} />
        </div>
        <div>
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            name="telefono"
            defaultValue={initial?.telefono ?? ""}
            placeholder="600 123 456"
          />
          <FieldError messages={errors.telefono} />
        </div>
      </div>

      <div>
        <Label htmlFor="jornalDiario">Jornal diario (€)</Label>
        <Input
          id="jornalDiario"
          name="jornalDiario"
          type="number"
          step="0.01"
          min="0"
          defaultValue={initial?.jornalDiario ?? ""}
          placeholder="80.00"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Dejar vacío si es voluntario (no cobra).
        </p>
        <FieldError messages={errors.jornalDiario} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="activo"
          defaultChecked={initial?.activo ?? true}
          className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
        />
        <span>Empleado activo (disponible para turnos).</span>
      </label>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : modo === "crear" ? "Crear empleado" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/empleados">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
