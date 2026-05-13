"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { TipoEmpleadoLite } from "../../_lib/perfiles";

export function FiltrosAsistencias({
  ediciones,
  edicionId,
  entidades,
  entidadId,
  casetas,
  casetaId,
  tiposEmpleado,
  tiposActivos,
}: {
  ediciones: Array<{ id: string; anio: number; nombre: string }>;
  edicionId: string;
  entidades: Array<{ id: string; nombre: string }>;
  entidadId: string;
  casetas: Array<{ id: string; nombre: string }>;
  casetaId: string;
  tiposEmpleado: TipoEmpleadoLite[];
  tiposActivos: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function actualizar(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/turnos/asistencias?${params.toString()}`);
  }

  function toggleTipo(id: string) {
    const set = new Set(tiposActivos);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const value = Array.from(set).join(",");
    actualizar("tipos", value);
  }

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Edición
          </label>
          <select
            value={edicionId}
            onChange={(e) => actualizar("edicionId", e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {ediciones.map((e) => (
              <option key={e.id} value={e.id}>
                {e.anio} · {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Entidad
          </label>
          <select
            value={entidadId}
            onChange={(e) => actualizar("entidadId", e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todas (incluye sin entidad)</option>
            {entidades.map((en) => (
              <option key={en.id} value={en.id}>
                {en.nombre}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground mt-1">
            Filtrar por entidad excluye empleados sin entidad asignada.
          </p>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Caseta
          </label>
          <select
            value={casetaId}
            onChange={(e) => actualizar("casetaId", e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todas</option>
            {casetas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Tipo de empleado
        </p>
        <div className="flex flex-wrap gap-2">
          {tiposEmpleado.map((t) => {
            const activo = tiposActivos.includes(t.id);
            return (
              <label
                key={t.id}
                className={`text-xs px-3 py-1 rounded-md border cursor-pointer ${
                  activo
                    ? "border-primary bg-primary/15"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={() => toggleTipo(t.id)}
                  className="sr-only"
                />
                {t.label}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
