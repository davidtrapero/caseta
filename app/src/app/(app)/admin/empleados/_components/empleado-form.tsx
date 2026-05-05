"use client";

import { useActionState, useState, useEffect } from "react";
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
import {
  PERFIL_ORDEN,
  PERFIL_LABEL,
  PERFIL_COLORES,
  type PerfilEmpleado,
} from "../../../turnos/_lib/perfiles";

type Modo = "crear" | "editar";

type EntidadMin = { id: string; nombre: string };

type EmpleadoFormProps = {
  modo: Modo;
  entidades: EntidadMin[];
  initial?: {
    id: string;
    nombre: string;
    dni: string | null;
    telefono: string | null;
    jornalDiario: string | null;
    entidadId: string | null;
    perfil: string;
    activo: boolean;
  };
};

export function EmpleadoForm({ modo, entidades, initial }: EmpleadoFormProps) {
  const action = modo === "crear" ? crearEmpleadoAction : actualizarEmpleadoAction;
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const [perfil, setPerfil] = useState<PerfilEmpleado>(
    (initial?.perfil as PerfilEmpleado) ?? "trabajador"
  );
  const [jornalDiario, setJornalDiario] = useState(initial?.jornalDiario ?? "");

  useEffect(() => {
    if (perfil === "voluntario") {
      // queueMicrotask: evita setState síncrono en effect (react-hooks/set-state-in-effect)
      queueMicrotask(() => setJornalDiario(""));
    }
  }, [perfil]);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const esVoluntario = perfil === "voluntario";

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
          <Label htmlFor="telefono">
            Teléfono{esVoluntario ? " *" : ""}
          </Label>
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
        <Label htmlFor="perfil">Perfil</Label>
        <input type="hidden" name="perfil" value={perfil} />
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 mt-1">
          {PERFIL_ORDEN.map((p) => {
            const colores = PERFIL_COLORES[p];
            const sel = perfil === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPerfil(p)}
                className="rounded-sm border px-2 py-1.5 text-xs font-medium transition-all"
                style={
                  sel
                    ? { background: colores.border, borderColor: colores.border, color: "hsl(40 48% 97%)" }
                    : { background: colores.bg, borderColor: colores.border, color: colores.text }
                }
              >
                {PERFIL_LABEL[p]}
              </button>
            );
          })}
        </div>
        <FieldError messages={errors.perfil} />
      </div>

      {esVoluntario && (
        <div>
          <Label htmlFor="entidadId">Entidad *</Label>
          <select
            id="entidadId"
            name="entidadId"
            defaultValue={initial?.entidadId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Selecciona una entidad —</option>
            {entidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <FieldError messages={errors.entidadId} />
        </div>
      )}

      <div>
        <Label htmlFor="jornalDiario">Jornal diario (€)</Label>
        <Input
          id="jornalDiario"
          name="jornalDiario"
          type="number"
          step="0.01"
          min="0"
          value={jornalDiario}
          onChange={(e) => setJornalDiario(e.target.value)}
          disabled={esVoluntario}
          placeholder={esVoluntario ? "No aplica (voluntario)" : "80.00"}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {esVoluntario
            ? "Los voluntarios no cobran jornal."
            : "Dejar vacío si es voluntario (usa el perfil Voluntario)."}
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
