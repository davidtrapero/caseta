"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "../../admin/_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import {
  crearEmpleadoAction,
  actualizarEmpleadoAction,
} from "../actions";
import {
  colorFor,
  ordenarTipos,
  type TipoEmpleadoLite,
} from "../../turnos/_lib/perfiles";

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
    email: string | null;
    telefono: string | null;
    jornalDiario: string | null;
    entidadId: string | null;
    tipoIds: string[];
    esVoluntario: boolean;
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
  // Tipo por defecto: los iniciales, o el primer no-voluntario, o el primero.
  const tipoIdsPorDefecto = initial?.tipoIds?.length
    ? initial.tipoIds
    : [
        tiposOrdenados.find((t) => !t.esVoluntario)?.id ??
          tiposOrdenados[0]?.id ??
          "",
      ].filter(Boolean);

  const [selectedTipoIds, setSelectedTipoIds] = useState<string[]>(tipoIdsPorDefecto);
  const [esVoluntario, setEsVoluntario] = useState<boolean>(initial?.esVoluntario ?? false);
  const [jornalDiario, setJornalDiario] = useState(initial?.jornalDiario ?? "");

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
      setSelectedTipoIds([caseta.tipoEmpleadoDefectoId]);
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

      <div>
        <Label>Tipo de empleado</Label>
        <div
          role="group"
          aria-label="Tipos de empleado"
          className="flex flex-wrap gap-2 mt-1.5"
        >
          {tiposOrdenados.map((t) => {
            const colores = colorFor(t);
            const sel = selectedTipoIds.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                role="checkbox"
                aria-checked={sel}
                onClick={() =>
                  setSelectedTipoIds((prev) =>
                    sel ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                  )
                }
                className="inline-flex items-center gap-2 rounded-md border-2 px-3.5 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                style={
                  sel
                    ? {
                        background: t.colorHex,
                        borderColor: t.colorHex,
                        color: colores.text === "#fdf8ec" ? colores.text : "#ffffff",
                        boxShadow: `0 1px 0 ${colores.border}55, 0 0 0 2px ${colores.bg}`,
                      }
                    : {
                        background: "transparent",
                        borderColor: t.colorHex,
                        color: colores.border,
                      }
                }
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    background: sel ? "rgba(255,255,255,0.85)" : t.colorHex,
                    boxShadow: sel ? "none" : `0 0 0 1px ${t.colorHex}`,
                  }}
                />
                {t.label}
              </button>
            );
          })}
        </div>
        {/* Hidden inputs: uno por tipo seleccionado */}
        {selectedTipoIds.map((id) => (
          <input key={id} type="hidden" name="tipoIds" value={id} />
        ))}
        <FieldError messages={errors.tipoIds} />

        <label className="flex items-center gap-2 text-sm mt-2">
          <input
            type="checkbox"
            name="esVoluntario"
            checked={esVoluntario}
            onChange={(e) => setEsVoluntario(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
          />
          <span>Voluntario (sin jornal, requiere entidad y teléfono)</span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!esVoluntario && (
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
        )}
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
        <div className={esVoluntario ? "" : "sm:col-span-2"}>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            placeholder="nombre@ejemplo.com"
          />
          <FieldError messages={errors.email} />
        </div>
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
          <Link href="/empleados">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
