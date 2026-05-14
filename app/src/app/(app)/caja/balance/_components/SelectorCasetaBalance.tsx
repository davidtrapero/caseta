"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Caseta = { id: string; nombre: string };

type Props = {
  casetas: Caseta[];
  casetaId: string | "";  // "" = todas
};

export function SelectorCasetaBalance({ casetas, casetaId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const cambiar = (id: string) => {
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (id === "") sp.delete("casetaId");
    else sp.set("casetaId", id);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
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
        <option value="">Todas</option>
        {casetas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
