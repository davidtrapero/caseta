"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { CasetaMin } from "../types";

export function SelectorCaseta({
  casetas,
  seleccionadaId,
}: {
  casetas: CasetaMin[];
  seleccionadaId: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground uppercase text-xs tracking-wider">Caseta</span>
      <select
        className="h-9 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={seleccionadaId}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("casetaId", e.target.value);
          startTransition(() => router.replace(`/turnos?${next.toString()}`));
        }}
      >
        {casetas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
            {c.activa ? "" : " (inactiva)"}
          </option>
        ))}
      </select>
    </label>
  );
}
