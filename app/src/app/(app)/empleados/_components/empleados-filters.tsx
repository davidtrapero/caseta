"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TipoEmpleadoLite } from "../../turnos/_lib/perfiles";

type Props = {
  tiposEmpleado: TipoEmpleadoLite[];
  initialQ: string;
  initialTipoId: string;
  initialSoloActivos: boolean;
};

const DEBOUNCE_MS = 250;

export function EmpleadosFilters({
  tiposEmpleado,
  initialQ,
  initialTipoId,
  initialSoloActivos,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(initialQ);
  const [tipoId, setTipoId] = useState(initialTipoId);
  const [soloActivos, setSoloActivos] = useState(initialSoloActivos);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  function pushParams(next: { q: string; tipoId: string; soloActivos: boolean }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q.trim()) params.set("q", next.q.trim());
    else params.delete("q");

    if (next.tipoId) params.set("tipoId", next.tipoId);
    else params.delete("tipoId");

    // default = activos. Solo persistimos cuando se desmarca.
    if (!next.soloActivos) params.set("soloActivos", "0");
    else params.delete("soloActivos");

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/empleados?${qs}` : `/empleados`);
    });
  }

  // Debounce sobre `q`. tipoId/soloActivos se aplican sin debounce.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pushParams({ q, tipoId, soloActivos });
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function onTipoChange(value: string) {
    setTipoId(value);
    pushParams({ q, tipoId: value, soloActivos });
  }

  function onSoloActivosChange(value: boolean) {
    setSoloActivos(value);
    pushParams({ q, tipoId, soloActivos: value });
  }

  function onLimpiar() {
    setQ("");
    setTipoId("");
    setSoloActivos(true);
    pushParams({ q: "", tipoId: "", soloActivos: true });
  }

  const hayFiltros = q.trim() !== "" || tipoId !== "" || !soloActivos;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-card/40 p-3">
      <div className="flex flex-1 min-w-[200px] flex-col">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Buscar
        </label>
        <Input
          type="search"
          placeholder="Nombre, DNI o teléfono"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Tipo
        </label>
        <select
          value={tipoId}
          onChange={(e) => onTipoChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {tiposEmpleado.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex select-none items-center gap-2 self-end pb-1.5 text-sm">
        <input
          type="checkbox"
          checked={soloActivos}
          onChange={(e) => onSoloActivosChange(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Solo activos
      </label>

      {hayFiltros ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onLimpiar}
          className="self-end"
        >
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}
