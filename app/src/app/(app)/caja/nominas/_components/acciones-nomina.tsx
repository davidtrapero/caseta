"use client";

import { marcarPagadaAction, desmarcarPagadaAction } from "../actions";

export function BotonMarcarPagada({ id }: { id: string }) {
  return (
    <form action={marcarPagadaAction}>
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Marcar pagada
      </button>
    </form>
  );
}

export function BotonDesmarcarPagada({ id }: { id: string }) {
  return (
    <form
      action={desmarcarPagadaAction}
      onSubmit={(e) => {
        if (!confirm("¿Desmarcar esta nómina como pagada?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Desmarcar
      </button>
    </form>
  );
}
