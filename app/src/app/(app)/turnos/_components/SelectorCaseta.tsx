"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CasetaMin } from "../types";

type Props = {
  casetas: CasetaMin[];
  casetaId: string;
};

export function SelectorCaseta({ casetas, casetaId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const cambiar = (id: string) => {
    const sp = new URLSearchParams(params?.toString() ?? "");
    sp.set("casetaId", id);
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground uppercase tracking-wider text-xs">
        Caseta
      </span>
      <select
        value={casetaId}
        onChange={(e) => cambiar(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
      >
        {casetas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
