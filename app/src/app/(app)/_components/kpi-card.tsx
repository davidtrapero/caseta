const FORMATO_EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

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
      ? "text-[hsl(var(--color-acento))]"
      : tono === "neto-negativo"
        ? "text-destructive-foreground"
        : tono === "negativo"
          ? "text-muted-foreground"
          : "text-foreground";

  const valorFormateado = esMoneda
    ? FORMATO_EUR.format(valor)
    : valor.toString();

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
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
