import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { loadSemanaTurnos } from "../_lib/loader";
import { SelectorCaseta } from "../_components/SelectorCaseta";
import { BotonDuplicarSemana } from "../_components/BotonDuplicarSemana";
import {
  DIAS_SEMANA_LARGOS,
  addDays,
  formatFechaCorta,
  horaDe,
  lunesToSemanaIso,
  semanaIsoToLunes,
} from "../_lib/fechas";
import { colorFor } from "../_lib/perfiles";
import { vacantesDeTurno } from "../_lib/loader";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "../../admin/_components/page-header";

type SP = Promise<{ casetaId?: string; semana?: string }>;

export default async function SemanaTurnosPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const sp = await searchParams;
  const puedeEditar = user.rol === "admin" || user.rol === "gerente";

  const lunesParam = sp.semana ? semanaIsoToLunes(sp.semana) : undefined;
  const semana = await loadSemanaTurnos({
    lunes: lunesParam,
    casetaId: sp.casetaId,
    readonly: !puedeEditar,
  });

  if (!semana) {
    return (
      <div>
        <h1 className="text-2xl mb-2">Turnos — Semana</h1>
        <EmptyState
          title="Faltan datos base"
          description="Necesitas al menos una edición y una caseta activa."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  const semanaAnterior = lunesToSemanaIso(addDays(semana.lunes, -7));
  const semanaSiguiente = lunesToSemanaIso(addDays(semana.lunes, 7));
  const casetaQS = `casetaId=${semana.casetaSeleccionada.id}`;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <header className="flex flex-col gap-3 border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Turnos · Semana · {semana.edicion.nombre}
            </div>
            <h1 className="text-2xl font-[var(--font-display)] mt-1">
              {semana.casetaSeleccionada.nombre}
            </h1>
          </div>
          <SelectorCaseta
            casetas={semana.casetas}
            casetaId={semana.casetaSeleccionada.id}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="icon" aria-label="Semana anterior">
            <Link href={`/turnos/semana?${casetaQS}&semana=${semanaAnterior}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="text-sm">
            <span className="font-mono">
              {formatFechaCorta(semana.lunes)} – {formatFechaCorta(semana.domingo)}
            </span>{" "}
            <span className="text-muted-foreground">
              ({lunesToSemanaIso(semana.lunes)})
            </span>
          </div>
          <Button asChild variant="outline" size="icon" aria-label="Semana siguiente">
            <Link href={`/turnos/semana?${casetaQS}&semana=${semanaSiguiente}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1" />
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/turnos/exportar/semana?${casetaQS}&semana=${lunesToSemanaIso(semana.lunes)}`}
              target="_blank"
            >
              Exportar semana
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/turnos/exportar/semana-global?semana=${lunesToSemanaIso(semana.lunes)}`}
              target="_blank"
            >
              Vista global
            </Link>
          </Button>
          {puedeEditar ? (
            <BotonDuplicarSemana
              casetaId={semana.casetaSeleccionada.id}
              edicionId={semana.edicion.id}
              lunesActual={semana.lunes}
              casetas={semana.casetas}
            />
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {semana.dias.map((d, i) => {
          const esHoy = d.fecha === semana.hoyIso;
          return (
            <Link
              key={d.fecha}
              href={`/turnos?fecha=${d.fecha}&${casetaQS}`}
              className={`flex flex-col rounded-lg border bg-card/80 p-3 shadow-sm transition-colors hover:border-primary/60 ${
                esHoy ? "border-primary" : "border-border"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {DIAS_SEMANA_LARGOS[i]}
              </div>
              <div className="font-mono text-sm">{formatFechaCorta(d.fecha)}</div>
              <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{d.numTurnos}</span>{" "}
                {d.numTurnos === 1 ? "turno" : "turnos"} ·{" "}
                <span className="font-semibold text-foreground">{d.numPersonas}</span>{" "}
                {d.numPersonas === 1 ? "persona" : "personas"}
              </div>

              {d.turnos.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-2">
                  {d.turnos.map((t) => {
                    const vacantes = vacantesDeTurno(t);
                    const conPlazas = t.plazas.length > 0;
                    const completo = conPlazas && vacantes.length === 0;
                    const indicador = !conPlazas
                      ? "bg-muted-foreground/40"
                      : completo
                        ? "bg-emerald-600"
                        : "bg-amber-500";
                    const indicadorTitle = !conPlazas
                      ? "Sin plazas definidas"
                      : completo
                        ? "Turno completo"
                        : `Faltan ${vacantes.reduce((s, v) => s + v.faltan, 0)} plaza(s)`;

                    // Conteo de asignados por tipo (para badges).
                    const asigPorTipo = new Map<string, number>();
                    for (const a of t.asignaciones) {
                      asigPorTipo.set(a.tipoEmpleadoId, (asigPorTipo.get(a.tipoEmpleadoId) ?? 0) + 1);
                    }
                    // Tipos a renderizar: union de plazas + tipos asignados, ordenados por TipoEmpleado.orden.
                    const tipoIds = new Set<string>([
                      ...t.plazas.map((p) => p.tipoEmpleadoId),
                      ...asigPorTipo.keys(),
                    ]);
                    const tiposBadge = semana.tiposEmpleado.filter((te) => tipoIds.has(te.id));

                    return (
                      <li key={t.id} className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            aria-hidden
                            title={indicadorTitle}
                            className={`inline-block h-2 w-2 rounded-full ${indicador}`}
                          />
                          <span className="font-mono text-[11px] tabular-nums">
                            {horaDe(t.fechaInicio)}–{horaDe(t.fechaFin)}
                          </span>
                        </div>
                        {tiposBadge.length > 0 ? (
                          <div className="flex flex-wrap gap-1 pl-3.5">
                            {tiposBadge.map((tipo) => {
                              const plaza = t.plazas.find((p) => p.tipoEmpleadoId === tipo.id);
                              const cantidad = plaza?.cantidad ?? 0;
                              const asignados = asigPorTipo.get(tipo.id) ?? 0;
                              const sinCubrir = cantidad > 0 && asignados < cantidad;
                              const colores = colorFor(tipo);
                              return (
                                <span
                                  key={tipo.id}
                                  className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                  style={{
                                    background: colores.bg,
                                    color: colores.text,
                                    border: `1px solid ${colores.border}`,
                                  }}
                                  title={`${tipo.label}: ${asignados}${cantidad > 0 ? `/${cantidad}` : ""}`}
                                >
                                  {tipo.labelCorto}
                                  <span className={sinCubrir ? "text-destructive font-bold" : ""}>
                                    {asignados}
                                    {cantidad > 0 ? `/${cantidad}` : ""}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
