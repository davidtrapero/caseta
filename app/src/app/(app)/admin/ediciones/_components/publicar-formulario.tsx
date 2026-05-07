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
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const url = token ? `${baseUrl}/apuntarse/${token}` : null;

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
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
      <div className="flex items-center gap-2 flex-wrap">
        <code
          className="text-xs bg-muted px-2 py-1 rounded max-w-[18rem] truncate"
          title={url ?? ""}
        >
          {url}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={copiar}
          disabled={disabled}
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || pending}
          onClick={handleRotar}
        >
          Rotar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || pending}
          onClick={handleDespublicar}
        >
          Despublicar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
