"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "../../_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import { colorFor } from "../../../turnos/_lib/perfiles";
import {
  crearTipoEmpleadoAction,
  actualizarTipoEmpleadoAction,
  eliminarTipoEmpleadoAction,
} from "../actions";

type Modo = "crear" | "editar";

type TipoEmpleadoFormProps = {
  modo: Modo;
  initial?: {
    id: string;
    slug: string;
    label: string;
    labelCorto: string;
    colorHex: string;
    orden: number;
    esVoluntario: boolean;
    activo: boolean;
    empleadosCount: number;
    plazasCount: number;
  };
};

export function TipoEmpleadoForm({ modo, initial }: TipoEmpleadoFormProps) {
  const action =
    modo === "crear" ? crearTipoEmpleadoAction : actualizarTipoEmpleadoAction;
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const [eliminarState, eliminarFormAction, eliminarPending] = useActionState<
    ActionResult | null,
    FormData
  >(eliminarTipoEmpleadoAction, null);

  const [colorHex, setColorHex] = useState(initial?.colorHex ?? "#9b1c2c");
  const [label, setLabel] = useState(initial?.label ?? "Tipo");

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const eliminarError =
    eliminarState && !eliminarState.ok ? eliminarState.error : null;

  const colorValido = /^#[0-9a-fA-F]{6}$/.test(colorHex);
  const previewColores = colorValido
    ? colorFor({ colorHex })
    : { bg: "#eee", border: "#999", text: "#333" };

  const enUso =
    modo === "editar" &&
    initial &&
    (initial.empleadosCount > 0 || initial.plazasCount > 0);

  function handleEliminar(e: React.FormEvent<HTMLFormElement>) {
    if (!initial) return;
    const msg = enUso
      ? "Este tipo está en uso. Se marcará como inactivo (soft delete). ¿Continuar?"
      : "Eliminar este tipo de forma permanente. ¿Continuar?";
    if (!window.confirm(msg)) {
      e.preventDefault();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        {state && !state.ok ? <FormError message={state.error} /> : null}

        {modo === "editar" && initial ? (
          <input type="hidden" name="_id" value={initial.id} />
        ) : null}

        <div>
          <Label htmlFor="slug">Identificador interno</Label>
          {modo === "editar" ? (
            <>
              <Input
                id="slug"
                value={initial?.slug ?? ""}
                disabled
                readOnly
              />
              <p className="text-xs text-muted-foreground mt-1">
                El identificador es inmutable: identifica el tipo de forma estable.
              </p>
            </>
          ) : (
            <>
              <Input
                id="slug"
                name="slug"
                placeholder="coordinador"
                required
                pattern="^[a-z][a-z0-9_-]*$"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Texto corto único que identifica el tipo internamente. Solo
                letras minúsculas, dígitos, guion o guion bajo. No editable
                después de crear.
              </p>
              <FieldError messages={errors.slug} />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="label">Etiqueta</Label>
            <Input
              id="label"
              name="label"
              defaultValue={initial?.label ?? ""}
              placeholder="Coordinador"
              onChange={(e) => setLabel(e.target.value)}
              required
            />
            <FieldError messages={errors.label} />
          </div>
          <div>
            <Label htmlFor="labelCorto">Etiqueta corta</Label>
            <Input
              id="labelCorto"
              name="labelCorto"
              defaultValue={initial?.labelCorto ?? ""}
              placeholder="Coord"
              maxLength={8}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Para tablas y celdas estrechas (máx 8 caracteres).
            </p>
            <FieldError messages={errors.labelCorto} />
          </div>
        </div>

        <div>
          <Label htmlFor="colorHexPicker">Color</Label>
          <input
            id="colorHexPicker"
            type="color"
            value={colorValido ? colorHex : "#9b1c2c"}
            onChange={(e) => setColorHex(e.target.value)}
            className="h-9 w-16 rounded-md border border-input bg-transparent p-1"
          />
          <input type="hidden" name="colorHex" value={colorHex} />
          <FieldError messages={errors.colorHex} />
        </div>

        <div>
          <Label>Vista previa</Label>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium uppercase tracking-wider"
              style={{
                background: previewColores.bg,
                borderColor: previewColores.border,
                color: previewColores.text,
              }}
            >
              {label || "Tipo"}
            </span>
            <span
              className="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wider"
              style={{
                background: previewColores.border,
                color: "hsl(40 48% 97%)",
              }}
            >
              {label || "Tipo"}
            </span>
          </div>
        </div>

        {modo === "editar" && (
          <div>
            <Label htmlFor="orden">Orden</Label>
            <Input
              id="orden"
              name="orden"
              type="number"
              min="0"
              step="1"
              defaultValue={initial?.orden ?? 0}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Posición relativa en listados y selectores (menor = antes).
            </p>
            <FieldError messages={errors.orden} />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="esVoluntario"
            defaultChecked={initial?.esVoluntario ?? false}
            className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
          />
          <span>
            Es categoría de voluntariado (sin jornal, requiere entidad asignada).
          </span>
        </label>

        {modo === "editar" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={initial?.activo ?? true}
              className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
            />
            <span>Categoría activa (disponible para asignar al personal y las plazas).</span>
          </label>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending
              ? "Guardando…"
              : modo === "crear"
                ? "Crear tipo"
                : "Guardar cambios"}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/admin/tipos-empleado">Cancelar</Link>
          </Button>
        </div>
      </form>

      {modo === "editar" && initial ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <h3 className="text-sm font-medium mb-1">Eliminar tipo</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {enUso
              ? `Este tipo está usado por ${initial.empleadosCount} empleado(s) y ${initial.plazasCount} plaza(s). No se puede borrar; al eliminar quedará marcado como inactivo.`
              : "El tipo no está en uso. La eliminación es permanente."}
          </p>
          {eliminarError ? <FormError message={eliminarError} /> : null}
          <form action={eliminarFormAction} onSubmit={handleEliminar}>
            <input type="hidden" name="_id" value={initial.id} />
            <Button
              type="submit"
              variant="destructive"
              disabled={eliminarPending}
            >
              {eliminarPending
                ? "Eliminando…"
                : enUso
                  ? "Marcar como inactivo"
                  : "Eliminar definitivamente"}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
