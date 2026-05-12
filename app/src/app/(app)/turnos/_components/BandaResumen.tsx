import type { ResumenAlcance, TipoEmpleadoLite } from "../types";

/**
 * Banda superior con KPIs operativos del alcance (día, semana, vista global).
 * - Pintada para pantalla y para impresión.
 * - El detalle de vacantes se muestra solo si hay > 0.
 */
export function BandaResumen({
  resumen,
  tipos,
  variante = "pantalla",
}: {
  resumen: ResumenAlcance;
  tipos: TipoEmpleadoLite[];
  variante?: "pantalla" | "papel";
}) {
  const { numTurnos, numPersonas, vacantes, plazasTotales, plazasCubiertas } = resumen;
  const cobertura = plazasTotales === 0 ? 0 : Math.round((plazasCubiertas / plazasTotales) * 100);

  const detalleVacantes = vacantes.porTipo
    .map((p) => {
      const t = tipos.find((x) => x.id === p.tipoEmpleadoId);
      return t ? `${p.faltan} ${t.label}${p.faltan === 1 ? "" : "s"}` : null;
    })
    .filter(Boolean)
    .join(" · ");

  if (variante === "papel") {
    return (
      <div className="banda-resumen-papel">
        <div className="banda-resumen-papel-row">
          <KpiPapel label="Turnos" value={numTurnos} />
          <KpiPapel label="Personas" value={numPersonas} />
          <KpiPapel label="Vacantes" value={vacantes.totalFaltan} tono={vacantes.totalFaltan > 0 ? "alerta" : "ok"} />
          <KpiPapel label="Cobertura" value={`${cobertura}%`} tono={cobertura === 100 ? "ok" : cobertura >= 70 ? undefined : "alerta"} />
        </div>
        {detalleVacantes ? (
          <div className="banda-resumen-papel-detalle">
            <strong>Falta cubrir:</strong> {detalleVacantes}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md px-4 py-3">
      <Kpi label="Turnos" value={numTurnos} />
      <span className="h-5 w-px bg-border/60" />
      <Kpi label="Personas" value={numPersonas} />
      <span className="h-5 w-px bg-border/60" />
      <Kpi
        label="Vacantes"
        value={vacantes.totalFaltan}
        tono={vacantes.totalFaltan > 0 ? "alerta" : "ok"}
      />
      <span className="h-5 w-px bg-border/60" />
      <Kpi
        label="Cobertura"
        value={`${cobertura}%`}
        tono={cobertura === 100 ? "ok" : cobertura >= 70 ? undefined : "alerta"}
      />
      {detalleVacantes ? (
        <div className="basis-full text-xs text-muted-foreground">
          <span className="font-semibold">Falta cubrir:</span> {detalleVacantes}
        </div>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  tono,
}: {
  label: string;
  value: number | string;
  tono?: "ok" | "alerta";
}) {
  const color =
    tono === "alerta"
      ? "text-[hsl(var(--destructive))]"
      : tono === "ok"
        ? "text-[hsl(var(--accent))]"
        : "text-foreground";
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`text-xl font-[var(--font-display)] tabular-nums ${color}`}>
        {value}
      </span>
    </div>
  );
}

function KpiPapel({
  label,
  value,
  tono,
}: {
  label: string;
  value: number | string;
  tono?: "ok" | "alerta";
}) {
  return (
    <div className={`banda-resumen-papel-kpi ${tono ?? ""}`}>
      <span className="banda-resumen-papel-label">{label}</span>
      <span className="banda-resumen-papel-value">{value}</span>
    </div>
  );
}
