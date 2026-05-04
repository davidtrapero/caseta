"use client";

import { eliminarGastoAction } from "../actions";

export function BotonEliminarGasto({ id }: { id: string }) {
  return (
    <form
      action={eliminarGastoAction}
      onSubmit={(e) => {
        if (!confirm("¿Eliminar este gasto? No se puede deshacer.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        className="text-xs text-destructive-foreground hover:underline"
      >
        Eliminar
      </button>
    </form>
  );
}
