"use client";

import { useState } from "react";
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

  if (!token) {
    return (
      <form action={publicarFormularioAction}>
        <input type="hidden" name="_id" value={edicionId} />
        <Button type="submit" size="sm" variant="outline" disabled={disabled}>
          Publicar formulario
        </Button>
      </form>
    );
  }

  return (
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
      <form
        action={rotarFormularioAction}
        onSubmit={(e) => {
          if (!confirm("Rotar el token invalidará la URL anterior. ¿Continuar?")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="_id" value={edicionId} />
        <Button type="submit" size="sm" variant="ghost" disabled={disabled}>
          Rotar
        </Button>
      </form>
      <form
        action={despublicarFormularioAction}
        onSubmit={(e) => {
          if (!confirm("Despublicar cerrará el formulario público. ¿Continuar?")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="_id" value={edicionId} />
        <Button type="submit" size="sm" variant="ghost" disabled={disabled}>
          Despublicar
        </Button>
      </form>
    </div>
  );
}
