"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { asignarEmpleadoAction } from "../actions";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/toaster";
import type { EmpleadoMin } from "../types";
import { cn } from "@/lib/utils";

type Props = {
  turnoId: string;
  empleados: EmpleadoMin[];
  yaAsignados: Set<string>;
};

export function AsignarEmpleado({ turnoId, empleados, yaAsignados }: Props) {
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
        setOpen(false);
      } else {
        show(state.error, "error");
      }
    }
  }, [state, show]);

  const disponibles = empleados.filter((e) => !yaAsignados.has(e.id));

  if (disponibles.length === 0) return null;

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
          className="absolute z-30 top-full left-0 mt-1 w-56 max-h-64 overflow-auto rounded-md border border-border bg-popover shadow-xl p-1"
          onMouseLeave={() => setOpen(false)}
        >
          {disponibles.map((e) => (
            <form key={e.id} action={action}>
              <input type="hidden" name="turnoId" value={turnoId} />
              <input type="hidden" name="empleadoId" value={e.id} />
              <button
                type="submit"
                disabled={pending}
                className="w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 flex items-center justify-between"
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
      ) : null}
    </div>
  );
}
