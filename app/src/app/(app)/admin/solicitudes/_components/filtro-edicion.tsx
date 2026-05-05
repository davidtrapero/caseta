"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function FiltroEdicion({
  ediciones,
  edicionId,
  estado,
}: {
  ediciones: Array<{ id: string; anio: number; nombre: string }>;
  edicionId: string;
  estado: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <select
      defaultValue={edicionId}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("estado", estado);
        if (e.target.value) {
          params.set("edicionId", e.target.value);
        } else {
          params.delete("edicionId");
        }
        router.push(`/admin/solicitudes?${params.toString()}`);
      }}
    >
      <option value="">Todas</option>
      {ediciones.map((ed) => (
        <option key={ed.id} value={ed.id}>
          {ed.anio} · {ed.nombre}
        </option>
      ))}
    </select>
  );
}
