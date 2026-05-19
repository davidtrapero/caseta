import { FMT_EUR_ENTERO } from "@/lib/intl";

type Tono = "positivo" | "negativo" | "neto-positivo" | "neto-negativo" | "neutro";

export function KpiCard({
  etiqueta,
  valor,
  nota,
  tono = "neutro",
  esMoneda = true,
}: {
  etiqueta: string;
  valor: number;
  nota?: string;
  tono?: Tono;
  esMoneda?: boolean;
}) {
  const colorValor =
    tono === "neto-positivo"
      ? "text-[hsl(var(--accent))]"
      : tono === "neto-negativo"
        ? "text-destructive-foreground"
        : tono === "negativo"
          ? "text-muted-foreground"
          : "text-foreground";

  const valorFormateado = esMoneda
    ? FMT_EUR_ENTERO.format(valor)
    : valor.toString();

  return (
    <div
      className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4 flex flex-col gap-1"
      style={{ boxShadow: "var(--surface-glass-shadow)" }}
    >
      <p className="text-[10px] font-medium uppercase tracking-widest text-primary">
        {etiqueta}
      </p>
      <p className={`font-mono text-2xl font-semibold tabular-nums leading-none ${colorValor}`}>
        {valorFormateado}
      </p>
      {nota ? (
        <p className="text-xs text-muted-foreground">{nota}</p>
      ) : null}
    </div>
  );
}
