"use client";

import * as React from "react";
import { useActionState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorEmpleado } from "../_lib/colores";
import {
  desasignarEmpleadoAction,
  toggleAsistenciaAction,
} from "../actions";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/toaster";

type Props = {
  turnoId: string;
  empleadoId: string;
  nombre: string;
  esVoluntario: boolean;
  asistio: boolean;
  /** Si true, muestra checkbox de asistencia editable. */
  permiteAsistencia: boolean;
  readonly: boolean;
};

export function ChipEmpleado({
  turnoId,
  empleadoId,
  nombre,
  esVoluntario,
  asistio,
  permiteAsistencia,
  readonly,
}: Props) {
  const colores = colorEmpleado(empleadoId);
  const { show } = useToast();

  const [asistState, asistAction, asistPending] = useActionState<
    ActionResult<{ asistio: boolean }> | null,
    FormData
  >(toggleAsistenciaAction, null);

  const [desState, desAction, desPending] = useActionState<
    ActionResult<{ turnoId: string; empleadoId: string }> | null,
    FormData
  >(desasignarEmpleadoAction, null);

  // Evitar re-disparo de toasts con el mismo state.
  const lastAsist = useRef<ActionResult<{ asistio: boolean }> | null>(null);
  const lastDes = useRef<ActionResult<{ turnoId: string; empleadoId: string }> | null>(
    null
  );

  useEffect(() => {
    if (asistState && asistState !== lastAsist.current) {
      lastAsist.current = asistState;
      if (!asistState.ok) show(asistState.error, "error");
    }
  }, [asistState, show]);

  useEffect(() => {
    if (desState && desState !== lastDes.current) {
      lastDes.current = desState;
      if (!desState.ok) show(desState.error, "error");
    }
  }, [desState, show]);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-sm pl-2 pr-1 py-1 text-xs",
        "border-l-4 border shadow-sm animate-fade-in"
      )}
      style={{
        background: colores.bg,
        borderLeftColor: colores.border,
        borderColor: colores.border,
        color: colores.text,
        borderStyle: esVoluntario ? "dashed" : "solid",
      }}
    >
      {permiteAsistencia ? (
        <form action={asistAction} className="flex items-center">
          <input type="hidden" name="turnoId" value={turnoId} />
          <input type="hidden" name="empleadoId" value={empleadoId} />
          <input type="hidden" name="asistio" value={asistio ? "false" : "true"} />
          <button
            type="submit"
            disabled={asistPending || readonly}
            title={asistio ? "Marcado como asistido" : "No asistió"}
            className={cn(
              "h-4 w-4 rounded-sm border flex items-center justify-center text-[10px] font-bold",
              asistio
                ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                : "bg-background/60 border-current"
            )}
            aria-label={asistio ? "Desmarcar asistencia" : "Marcar asistencia"}
          >
            {asistio ? "✓" : ""}
          </button>
        </form>
      ) : null}
      <span className="font-medium whitespace-nowrap">{nombre}</span>
      {esVoluntario ? (
        <span className="opacity-60 uppercase tracking-wider text-[9px]">vol.</span>
      ) : null}
      {!readonly ? (
        <form action={desAction}>
          <input type="hidden" name="turnoId" value={turnoId} />
          <input type="hidden" name="empleadoId" value={empleadoId} />
          <button
            type="submit"
            disabled={desPending}
            aria-label={`Quitar ${nombre}`}
            className="opacity-40 hover:opacity-100 transition-opacity p-0.5"
            title="Quitar empleado"
          >
            <X className="h-3 w-3" />
          </button>
        </form>
      ) : null}
    </div>
  );
}
