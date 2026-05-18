import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { loadSemanaTurnos, resumenAlcance, vacantesDeTurno } from "../_lib/loader";
import { SelectorCaseta } from "../_components/SelectorCaseta";
import { BotonDuplicarSemana } from "../_components/BotonDuplicarSemana";
import { BandaResumen } from "../_components/BandaResumen";
import {
  DIAS_SEMANA_LARGOS,
  addDays,
  formatFechaCorta,
  horaDe,
  lunesToSemanaIso,
  semanaIsoToLunes,
} from "../_lib/fechas";
import { agruparPorRol, nombreCorto } from "../_lib/perfiles";
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
          description="Crea una edición y caseta activas."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  const semanaAnterior = lunesToSemanaIso(addDays(semana.lunes, -7));
  const semanaSiguiente = lunesToSemanaIso(addDays(semana.lunes, 7));
  const casetaQS = `casetaId=${semana.casetaSeleccionada.id}`;
  const resumen = resumenAlcance(semana.turnos);

  const ROL_LABEL: Record<"coordinadores" | "trabajadores" | "voluntarios" | "otros", { singular: string; plural: string }> = {
    coordinadores: { singular: "Coordinación", plural: "Coordinación" },
    trabajadores: { singular: "Personal contratado", plural: "Personal contratado" },
    voluntarios: { singular: "Persona voluntaria", plural: "Personas voluntarias" },
    otros: { singular: "Otros", plural: "Otros" },
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <header className="flex flex-col gap-3 border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary">
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

        <BandaResumen resumen={resumen} tipos={semana.tiposEmpleado} />

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
          <span className="h-5 w-px bg-border/60 mx-1" />
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
          const vacio = d.turnos.length === 0;
          return (
            <Link
              key={d.fecha}
              href={`/turnos?fecha=${d.fecha}&${casetaQS}`}
              className={`flex flex-col rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-3 transition-colors hover:border-[var(--surface-glass-border)] hover:opacity-90 hover:shadow-md${vacio ? " min-h-[60px] opacity-70" : ""}`}
              style={{
                boxShadow: "var(--surface-glass-shadow)",
                ...(esHoy && { borderColor: "hsl(var(--primary))", boxShadow: "var(--surface-glass-shadow), 0 0 0 1px hsl(var(--primary) / 0.4)" }),
              }}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {DIAS_SEMANA_LARGOS[i]}
              </div>
              <div className="font-mono text-sm">{formatFechaCorta(d.fecha)}</div>
              {vacio ? (
                <div className="mt-2 text-xs text-muted-foreground italic">Sin turnos</div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                  <span className="font-semibold text-foreground">{d.numTurnos}</span>{" "}
                  {d.numTurnos === 1 ? "turno" : "turnos"} ·{" "}
                  <span className="font-semibold text-foreground">{d.numPersonas}</span>{" "}
                  {d.numPersonas === 1 ? "persona" : "personas"}
                </div>
              )}

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

                    const grupos = agruparPorRol(t.asignaciones, semana.tiposEmpleado);
                    const ordenGrupos: Array<keyof typeof grupos> = [
                      "coordinadores",
                      "trabajadores",
                      "voluntarios",
                      "otros",
                    ];

                    const detalleVacantes = vacantes
                      .map((v) => {
                        const tipo = semana.tiposEmpleado.find((te) => te.id === v.tipoEmpleadoId);
                        if (!tipo) return null;
                        const label = v.faltan === 1 ? tipo.labelCorto : `${tipo.labelCorto}s`;
                        return `${v.faltan} ${label}`;
                      })
                      .filter(Boolean)
                      .join(" · ");

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
                        <div className="flex flex-col gap-1 pl-3.5">
                          {ordenGrupos.map((rol) => {
                            const asigs = grupos[rol];
                            if (asigs.length === 0) return null;
                            const labels = ROL_LABEL[rol];
                            const eyebrow = asigs.length === 1 ? labels.singular : labels.plural;
                            return (
                              <p key={rol} className="flex flex-col leading-tight">
                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                                  {eyebrow}
                                </span>
                                <span className="text-[11px] text-foreground">
                                  {asigs.map((a) => nombreCorto(a.empleadoNombre)).join(" · ")}
                                </span>
                              </p>
                            );
                          })}
                          {detalleVacantes ? (
                            <p className="text-[10px] text-[hsl(var(--destructive))]">
                              Faltan: {detalleVacantes}
                            </p>
                          ) : null}
                        </div>
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
