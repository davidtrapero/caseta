"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { asignarEmpleadoAction } from "../actions";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/toaster";
import type { EmpleadoMin, TurnoPlazaSerializable } from "../types";
import {
  PERFIL_ORDEN,
  PERFIL_LABEL,
  PERFIL_COLORES,
} from "../_lib/perfiles";
import { cn } from "@/lib/utils";

type Props = {
  turnoId: string;
  empleados: EmpleadoMin[];
  yaAsignados: Set<string>;
  plazas?: TurnoPlazaSerializable[];
  asignadosPorPerfil?: Record<string, number>;
};

export function AsignarEmpleado({
  turnoId,
  empleados,
  yaAsignados,
  plazas = [],
  asignadosPorPerfil = {},
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<
    ActionResult<{ turnoId: string; empleadoId: string }> | null,
    FormData
  >(asignarEmpleadoAction, null);
  const { show } = useToast();
  const last = useRef(state);

  useEffect(() => {
    if (state && state !== last.current) {
      last.current = state;
      if (state.ok) {
        // queueMicrotask: evita setState síncrono en effect (react-hooks/set-state-in-effect)
        queueMicrotask(() => setOpen(false));
      } else {
        show(state.error, "error");
      }
    }
  }, [state, show]);

  const disponibles = empleados.filter((e) => !yaAsignados.has(e.id));
  if (disponibles.length === 0) return null;

  const plazasMap = new Map(plazas.map((p) => [p.perfil, p.cantidad]));

  // Agrupar disponibles por perfil en PERFIL_ORDEN.
  const grupos = PERFIL_ORDEN.map((perfil) => ({
    perfil,
    empleados: disponibles.filter((e) => e.perfil === perfil),
    plazas: plazasMap.get(perfil) ?? 0,
    asignados: asignadosPorPerfil[perfil] ?? 0,
  })).filter((g) => g.empleados.length > 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm border border-dashed border-border/80 px-2 py-1 text-xs text-muted-foreground",
          "hover:border-primary hover:text-foreground transition-colors"
        )}
        aria-label="Añadir empleado"
      >
        <Plus className="h-3 w-3" /> empleado
      </button>
      {open ? (
        <div
          className="absolute z-30 top-full left-0 mt-1 w-64 max-h-72 overflow-auto rounded-md border border-border bg-popover shadow-xl p-1"
          onMouseLeave={() => setOpen(false)}
        >
          {grupos.map((g) => {
            const colores = PERFIL_COLORES[g.perfil];
            const pendientes = Math.max(0, g.plazas - g.asignados);
            return (
              <div key={g.perfil} className="mb-1 last:mb-0">
                <div
                  className="flex items-center justify-between px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wider"
                  style={{ background: colores.bg, color: colores.text }}
                >
                  <span>{PERFIL_LABEL[g.perfil]}</span>
                  {g.plazas > 0 ? (
                    <span
                      className={cn(
                        "tabular-nums",
                        pendientes > 0 ? "text-destructive" : "opacity-60"
                      )}
                    >
                      {g.asignados}/{g.plazas}
                    </span>
                  ) : null}
                </div>
                {g.empleados.map((e) => (
                  <form key={e.id} action={action}>
                    <input type="hidden" name="turnoId" value={turnoId} />
                    <input type="hidden" name="empleadoId" value={e.id} />
                    <button
                      type="submit"
                      disabled={pending}
                      className="w-full text-left text-sm px-2 py-1 rounded-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 flex items-center justify-between"
                    >
                      <span>{e.nombre}</span>
                      {e.esVoluntario ? (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          vol.
                        </span>
                      ) : null}
                    </button>
                  </form>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
