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
  colorFor,
  ordenarTipos,
  type TipoEmpleadoLite,
} from "../../../turnos/_lib/perfiles";

type Modo = "crear" | "editar";

type EntidadMin = { id: string; nombre: string };

type CasetaDefault = {
  id: string;
  nombre: string;
  jornalDiarioDefault: string | null;
  tipoEmpleadoDefectoId: string | null;
};

type EmpleadoFormProps = {
  modo: Modo;
  entidades: EntidadMin[];
  tiposEmpleado: TipoEmpleadoLite[];
  casetasDefaults?: CasetaDefault[];
  initial?: {
    id: string;
    nombre: string;
    dni: string | null;
    telefono: string | null;
    jornalDiario: string | null;
    entidadId: string | null;
    tipoEmpleadoId: string;
    activo: boolean;
  };
};

export function EmpleadoForm({
  modo,
  entidades,
  tiposEmpleado,
  casetasDefaults,
  initial,
}: EmpleadoFormProps) {
  const action = modo === "crear" ? crearEmpleadoAction : actualizarEmpleadoAction;
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const tiposOrdenados = ordenarTipos(tiposEmpleado);
  // Tipo por defecto: el inicial, o el primer no-voluntario, o el primero.
  const tipoInicial =
    initial?.tipoEmpleadoId ??
    tiposOrdenados.find((t) => !t.esVoluntario)?.id ??
    tiposOrdenados[0]?.id ??
    "";

  const [tipoEmpleadoId, setTipoEmpleadoId] = useState<string>(tipoInicial);
  const [jornalDiario, setJornalDiario] = useState(initial?.jornalDiario ?? "");

  const tipoSeleccionado = tiposOrdenados.find((t) => t.id === tipoEmpleadoId);
  const esVoluntario = tipoSeleccionado?.esVoluntario ?? false;

  useEffect(() => {
    if (esVoluntario) {
      // queueMicrotask: evita setState síncrono en effect (react-hooks/set-state-in-effect)
      queueMicrotask(() => setJornalDiario(""));
    }
  }, [esVoluntario]);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  function precargarCaseta(casetaId: string) {
    const caseta = casetasDefaults?.find((c) => c.id === casetaId);
    if (!caseta) return;
    if (caseta.tipoEmpleadoDefectoId) {
      setTipoEmpleadoId(caseta.tipoEmpleadoDefectoId);
    }
    if (caseta.jornalDiarioDefault) {
      setJornalDiario(caseta.jornalDiarioDefault);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? <FormError message={state.error} /> : null}

      {modo === "editar" && initial ? (
        <input type="hidden" name="_id" value={initial.id} />
      ) : null}

      {modo === "crear" && casetasDefaults && casetasDefaults.length > 0 ? (
        <div>
          <Label htmlFor="precargarCaseta">Precargar desde caseta</Label>
          <select
            id="precargarCaseta"
            defaultValue=""
            onChange={(e) => precargarCaseta(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Sin precargar —</option>
            {casetasDefaults.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Prerrellena jornal y tipo con los valores por defecto de la caseta.
          </p>
        </div>
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
        <Label htmlFor="tipoEmpleadoId">Tipo de empleado</Label>
        <input type="hidden" name="tipoEmpleadoId" value={tipoEmpleadoId} />
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 mt-1">
          {tiposOrdenados.map((t) => {
            const colores = colorFor(t);
            const sel = tipoEmpleadoId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipoEmpleadoId(t.id)}
                className="rounded-sm border px-2 py-1.5 text-xs font-medium transition-all"
                style={
                  sel
                    ? { background: colores.border, borderColor: colores.border, color: "hsl(40 48% 97%)" }
                    : { background: colores.bg, borderColor: colores.border, color: colores.text }
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <FieldError messages={errors.tipoEmpleadoId} />
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
            : "Dejar vacío si es voluntario (selecciona el tipo Voluntario)."}
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
