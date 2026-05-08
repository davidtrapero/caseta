"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { desasignarTurnoDesdeEmpleadoAction } from "../../../turnos/actions";
import {
  formatDiaLargoTurno,
  formatRangoTurno,
} from "../../../turnos/_lib/fechas";

type TurnoItem = {
  turnoId: string;
  fechaInicio: string;
  fechaFin: string;
  casetaNombre: string;
};

type Props = {
  empleadoId: string;
  turnos: TurnoItem[];
};

export function TurnosAsignadosEmpleado({ empleadoId, turnos }: Props) {
  return (
    <section className="mt-10 border-t pt-8">
      <header className="mb-4">
        <h2 className="text-base font-semibold">Turnos asignados</h2>
        <p className="text-sm text-muted-foreground">
          Próximos turnos del empleado en la edición activa.
        </p>
      </header>

      {turnos.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No tiene turnos asignados.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {turnos.map((t) => (
            <FilaTurno key={t.turnoId} empleadoId={empleadoId} turno={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilaTurno({
  empleadoId,
  turno,
}: {
  empleadoId: string;
  turno: TurnoItem;
}) {
  const [pending, startTransition] = useTransition();
  const inicio = new Date(turno.fechaInicio);
  const fin = new Date(turno.fechaFin);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (
      !confirm(
        `¿Quitar al empleado de este turno?\n\n${formatDiaLargoTurno(inicio)} · ${formatRangoTurno(inicio, fin)} · ${turno.casetaNombre}`
      )
    ) {
      e.preventDefault();
      return;
    }
    const formData = new FormData(e.currentTarget);
    e.preventDefault();
    startTransition(async () => {
      await desasignarTurnoDesdeEmpleadoAction(null, formData);
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
      <div className="flex flex-col gap-0.5 text-sm">
        <span className="font-medium capitalize">
          {formatDiaLargoTurno(inicio)}
        </span>
        <span className="text-muted-foreground font-mono text-xs">
          {formatRangoTurno(inicio, fin)} · {turno.casetaNombre}
        </span>
      </div>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="turnoId" value={turno.turnoId} />
        <input type="hidden" name="empleadoId" value={empleadoId} />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={pending}
          aria-label="Quitar del turno"
          title="Quitar del turno"
          className="text-muted-foreground hover:text-destructive"
        >
          {pending ? "…" : "✕"}
        </Button>
      </form>
    </li>
  );
}
