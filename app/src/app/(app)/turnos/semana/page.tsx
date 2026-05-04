import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { loadSemanaTurnos } from "../_lib/loader";
import { SelectorCaseta } from "../_components/SelectorCaseta";
import { BotonDuplicarSemana } from "../_components/BotonDuplicarSemana";
import {
  DIAS_SEMANA_LARGOS,
  addDays,
  formatFechaCorta,
  lunesToSemanaIso,
  semanaIsoToLunes,
} from "../_lib/fechas";
import { PERFIL_COLORES, PERFIL_LABEL_CORTO } from "../_lib/perfiles";
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
          {puedeEditar ? (
            <BotonDuplicarSemana
              casetaId={semana.casetaSeleccionada.id}
              edicionId={semana.edicion.id}
              lunesActual={semana.lunes}
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
              className={`block rounded-lg border bg-card/80 p-3 shadow-sm transition-colors hover:border-primary/60 ${
                esHoy ? "border-primary" : "border-border"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {DIAS_SEMANA_LARGOS[i]}
              </div>
              <div className="font-mono text-sm">{formatFechaCorta(d.fecha)}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums">
                  {d.numTurnos}
                </span>
                <span className="text-xs text-muted-foreground">
                  {d.numTurnos === 1 ? "turno" : "turnos"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {d.numPersonas}{" "}
                {d.numPersonas === 1 ? "persona" : "personas"}
              </div>
              {d.desglose.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {d.desglose.map((dp) => {
                    const colores = PERFIL_COLORES[dp.perfil];
                    const sinCubrir = dp.plazas > 0 && dp.asignados < dp.plazas;
                    return (
                      <span
                        key={dp.perfil}
                        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: colores.bg, color: colores.text, border: `1px solid ${colores.border}` }}
                        title={`${PERFIL_LABEL_CORTO[dp.perfil]}: ${dp.asignados}${dp.plazas > 0 ? `/${dp.plazas}` : ""}`}
                      >
                        {PERFIL_LABEL_CORTO[dp.perfil]}
                        <span className={sinCubrir ? "text-destructive font-bold" : ""}>
                          {dp.asignados}
                          {dp.plazas > 0 ? `/${dp.plazas}` : ""}
                        </span>
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
