"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CasetaMin } from "../types";

type Props = {
  casetas: CasetaMin[];
  seleccionadas: string[]; // ids; vacío = todas
};

/**
 * Multi-select por checkboxes en un <details> nativo. Sin filtro = todas las
 * casetas (param ausente). Con filtro = `?casetaIds=id1,id2`. Compatible con
 * el `casetaId` singular existente: si llega solo, se trata como lista de uno.
 */
export function FiltroCasetas({ casetas, seleccionadas }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const todasSeleccionadas = seleccionadas.length === 0;

  const aplicar = (ids: string[]) => {
    const sp = new URLSearchParams(params?.toString() ?? "");
    sp.delete("casetaId");
    if (ids.length === 0) {
      sp.delete("casetaIds");
    } else {
      sp.set("casetaIds", ids.join(","));
    }
    router.push(`${pathname}?${sp.toString()}`);
  };

  const toggle = (id: string, checked: boolean) => {
    const base = todasSeleccionadas ? casetas.map((c) => c.id) : [...seleccionadas];
    const next = checked ? Array.from(new Set([...base, id])) : base.filter((x) => x !== id);
    if (next.length === casetas.length) {
      aplicar([]);
    } else {
      aplicar(next);
    }
  };

  const resumen = todasSeleccionadas
    ? "Todas las casetas"
    : `${seleccionadas.length} de ${casetas.length}`;

  return (
    <details className="no-print relative inline-block text-sm">
      <summary className="inline-flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 cursor-pointer select-none hover:bg-muted/40">
        <span className="text-muted-foreground uppercase tracking-wider text-xs">
          Casetas
        </span>
        <span>{resumen}</span>
      </summary>
      <div className="absolute z-20 mt-1 min-w-[220px] rounded-md border border-border bg-background shadow-md p-2 flex flex-col gap-1">
        <button
          type="button"
          className="text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1"
          onClick={() => aplicar([])}
        >
          Limpiar filtro (todas)
        </button>
        <div className="h-px bg-border/60 my-1" />
        {casetas.map((c) => {
          const checked =
            todasSeleccionadas || seleccionadas.includes(c.id);
          return (
            <label
              key={c.id}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/40 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => toggle(c.id, e.target.checked)}
              />
              <span>{c.nombre}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}
