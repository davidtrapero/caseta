"use client";

import dynamic from "next/dynamic";

const GraficoDiario = dynamic(
  () => import("./GraficoDiario").then((m) => ({ default: m.GraficoDiario })),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)]" />
    ),
  }
);

type Props = {
  data: { fecha: string; ingresos: number; gastos: number }[];
};

export function GraficoDiarioLazy({ data }: Props) {
  return <GraficoDiario data={data} />;
}
