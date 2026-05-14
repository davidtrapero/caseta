"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { asignarEmpleadoAction } from "../actions";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/toaster";
import type {
  EmpleadoMin,
  TipoEmpleadoLite,
  TurnoPlazaSerializable,
} from "../types";
import { colorFor, ordenarTipos } from "../_lib/perfiles";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { normalizar } from "@/lib/text-normalize";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  turnoId: string;
  empleados: EmpleadoMin[];
  yaAsignados: Set<string>;
  tiposEmpleado: TipoEmpleadoLite[];
  plazas?: TurnoPlazaSerializable[];
  asignadosPorTipo?: Record<string, number>;
};

export function AsignarEmpleado({
  turnoId,
  empleados,
  yaAsignados,
  tiposEmpleado,
  plazas = [],
  asignadosPorTipo = {},
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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

  const plazasMap = new Map(plazas.map((p) => [p.tipoEmpleadoId, p.cantidad]));

  // Filtrado client-side por nombre, ignorando tildes/case. ≤30 empleados
  // típicos: sin debounce.
  const queryNorm = normalizar(query.trim());
  const disponiblesFiltrados = queryNorm
    ? disponibles.filter((e) => normalizar(e.nombre).includes(queryNorm))
    : disponibles;

  // Agrupar disponibles por tipo, en el orden definido por TipoEmpleado.orden.
  const grupos = ordenarTipos(tiposEmpleado)
    .map((tipo) => ({
      tipo,
      empleados: disponiblesFiltrados.filter((e) => e.tipoEmpleadoIds.includes(tipo.id)),
      plazas: plazasMap.get(tipo.id) ?? 0,
      asignados: asignadosPorTipo[tipo.id] ?? 0,
    }))
    .filter((g) => g.empleados.length > 0);

  const sinResultados = queryNorm !== "" && grupos.length === 0;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        // Resetea el query al abrir y al cerrar para que no persista la
        // búsqueda anterior entre aperturas.
        setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-sm border border-dashed border-border/80 px-2 py-1 text-xs text-muted-foreground",
            "hover:border-primary hover:text-foreground transition-colors"
          )}
          aria-label="Añadir empleado"
        >
          <Plus className="h-3 w-3" /> empleado
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 max-h-72 overflow-auto p-1"
        align="start"
        sideOffset={4}
      >
        <div className="p-1 mb-1">
          <Input
            type="search"
            placeholder="Buscar..."
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        {sinResultados ? (
          <div className="px-2 py-3 text-center text-xs text-muted-foreground">
            Sin coincidencias
          </div>
        ) : null}
        {grupos.map((g) => {
            const colores = colorFor(g.tipo);
            const pendientes = Math.max(0, g.plazas - g.asignados);
            return (
              <div key={g.tipo.id} className="mb-1 last:mb-0">
                <div
                  className="flex items-center justify-between px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wider"
                  style={{ background: colores.bg, color: colores.text }}
                >
                  <span>{g.tipo.label}</span>
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
                    <input type="hidden" name="tipoImputadoId" value={g.tipo.id} />
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
      </PopoverContent>
    </Popover>
  );
}
