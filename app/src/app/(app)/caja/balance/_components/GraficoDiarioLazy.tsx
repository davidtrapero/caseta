"use client";

import dynamic from "next/dynamic";

const GraficoDiario = dynamic(
  () => import("./GraficoDiario").then((m) => ({ default: m.GraficoDiario })),
  { ssr: false }
);

type Props = {
  data: { fecha: string; ingresos: number; gastos: number }[];
};

export function GraficoDiarioLazy({ data }: Props) {
  return <GraficoDiario data={data} />;
}
