"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  publicarFormularioAction,
  rotarFormularioAction,
  despublicarFormularioAction,
} from "../actions";

export function PublicarFormulario({
  edicionId,
  token,
  baseUrl,
  disabled,
}: {
  edicionId: string;
  token: string | null;
  baseUrl: string;
  disabled?: boolean;
}) {
  const [copiado, setCopiado] = useState<"voluntarios" | "empleados" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const urlVoluntarios = token ? `${baseUrl}/apuntarse/${token}` : null;
  const urlEmpleados = token ? `${baseUrl}/apuntarse-empleado/${token}` : null;

  async function copiar(tipo: "voluntarios" | "empleados") {
    const urlACopiar = tipo === "voluntarios" ? urlVoluntarios : urlEmpleados;
    if (!urlACopiar) return;
    try {
      await navigator.clipboard.writeText(urlACopiar);
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      // ignorar — clipboard puede fallar en navegadores restrictivos
    }
  }

  function handlePublicar() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("_id", edicionId);
      const result = await publicarFormularioAction(null, fd);
      if (!result.ok) setError(result.error);
      else setError(null);
    });
  }

  function handleRotar() {
    if (!confirm("Rotar el token invalidará la URL anterior. ¿Continuar?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("_id", edicionId);
      const result = await rotarFormularioAction(null, fd);
      if (!result.ok) setError(result.error);
      else setError(null);
    });
  }

  function handleDespublicar() {
    if (!confirm("Despublicar cerrará el formulario público. ¿Continuar?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("_id", edicionId);
      const result = await despublicarFormularioAction(null, fd);
      if (!result.ok) setError(result.error);
      else setError(null);
    });
  }

  if (!token) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || pending}
          onClick={handlePublicar}
        >
          Publicar formulario
        </Button>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-col gap-2">
        {/* Fila Voluntarios */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">Voluntarios</span>
          <code
            className="text-xs bg-muted px-2 py-1 rounded max-w-[18rem] truncate"
            title={urlVoluntarios ?? ""}
          >
            {urlVoluntarios}
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => copiar("voluntarios")}
            disabled={disabled}
          >
            {copiado === "voluntarios" ? "Copiado ✓" : "Copiar"}
          </Button>
        </div>
        {/* Fila Empleados */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">Empleados</span>
          <code
            className="text-xs bg-muted px-2 py-1 rounded max-w-[18rem] truncate"
            title={urlEmpleados ?? ""}
          >
            {urlEmpleados}
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => copiar("empleados")}
            disabled={disabled}
          >
            {copiado === "empleados" ? "Copiado ✓" : "Copiar"}
          </Button>
        </div>
        {/* Botones únicos */}
        <div className="flex items-center gap-2 mt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || pending}
            onClick={handleRotar}
          >
            Rotar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={disabled || pending}
            onClick={handleDespublicar}
          >
            Despublicar
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
