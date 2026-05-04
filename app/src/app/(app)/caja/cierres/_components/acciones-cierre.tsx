"use client";

import {
  bloquearCierreAction,
  desbloquearCierreAction,
  eliminarCierreAction,
} from "../actions";

export function BotonBloquear({ id }: { id: string }) {
  return (
    <form action={bloquearCierreAction}>
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Bloquear
      </button>
    </form>
  );
}

export function BotonDesbloquear({ id }: { id: string }) {
  return (
    <form action={desbloquearCierreAction}>
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Desbloquear
      </button>
    </form>
  );
}

export function BotonEliminar({ id }: { id: string }) {
  return (
    <form
      action={eliminarCierreAction}
      onSubmit={(e) => {
        if (!confirm("¿Eliminar este cierre? No se puede deshacer.")) {
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
