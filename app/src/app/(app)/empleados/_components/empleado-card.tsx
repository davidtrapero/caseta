import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleActivoEmpleadoForm } from "./toggle-activo";
import { colorFor, type TipoEmpleadoLite } from "../../turnos/_lib/perfiles";

const FORMATO_EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const FECHA_TURNO = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

const HORA_TURNO = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

export type TurnoLite = {
  id: string;
  fechaInicio: Date;
  fechaFin: Date;
  caseta: { nombre: string };
};

export type EmpleadoCardData = {
  id: string;
  nombre: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  jornalDiario: number | null;
  activo: boolean;
  tipoEmpleado: TipoEmpleadoLite;
  turnos: TurnoLite[];
};

export function EmpleadoCard({
  empleado,
  puedeEditar,
}: {
  empleado: EmpleadoCardData;
  puedeEditar: boolean;
}) {
  const colores = colorFor(empleado.tipoEmpleado);
  const turnos = empleado.turnos;
  const tieneTurnos = turnos.length > 0;

  return (
    <article
      className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4 transition-opacity"
      style={{ opacity: empleado.activo ? 1 : 0.7, boxShadow: "var(--surface-glass-shadow)" }}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium leading-tight">
              {empleado.nombre}
            </h3>
            <span
              className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
              style={{
                background: colores.bg,
                color: colores.text,
                border: `1px solid ${colores.border}`,
              }}
            >
              {empleado.tipoEmpleado.label}
            </span>
          </div>
          <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto_1fr] items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="text-muted-foreground/70">DNI:</span>
            <span className="font-mono">{empleado.dni ?? "—"}</span>
            <span className="text-muted-foreground/70">Tel:</span>
            <span>{empleado.telefono ?? "—"}</span>
            <span className="text-muted-foreground/70">Email:</span>
            <span className="truncate">{empleado.email ?? "—"}</span>
            <span className="text-muted-foreground/70">Jornal:</span>
            <span>
              {empleado.jornalDiario === null ? (
                <Badge variant="outline">Voluntario</Badge>
              ) : (
                <span className="font-mono">
                  {FORMATO_EUR.format(empleado.jornalDiario)}
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ToggleActivoEmpleadoForm
            id={empleado.id}
            activo={empleado.activo}
            disabled={!puedeEditar}
          />
          {puedeEditar ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={`/empleados/${empleado.id}`}>Editar</Link>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mt-3">
        {tieneTurnos ? (
          <details className="group">
            <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
              <span className="font-medium">
                Turnos asignados ({turnos.length})
              </span>{" "}
              <span className="text-muted-foreground/60">
                — edición activa, desde hoy
              </span>
            </summary>
            <ul className="mt-2 space-y-1 border-l border-[var(--surface-glass-border)] pl-3">
              {turnos.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-baseline gap-x-3 text-xs"
                >
                  <span className="font-mono text-foreground">
                    {FECHA_TURNO.format(t.fechaInicio)}
                  </span>
                  <span className="text-muted-foreground">
                    {HORA_TURNO.format(t.fechaInicio)}–
                    {HORA_TURNO.format(t.fechaFin)}
                  </span>
                  <span className="text-muted-foreground/80">
                    · {t.caseta.nombre}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="text-xs text-muted-foreground/70">
            Sin turnos asignados.
          </p>
        )}
      </div>
    </article>
  );
}
