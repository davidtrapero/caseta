"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FMT_EUR_ENTERO } from "@/lib/intl";

type Props = {
  data: { fecha: string; ingresos: number; gastos: number }[];
};

export function GraficoDiario({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--surface-glass-border)] bg-[var(--surface-glass)] p-8 text-center text-sm text-muted-foreground">
        Sin movimientos para representar.
      </div>
    );
  }

  return (
    <div className="h-72 w-full rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] p-4 backdrop-blur-md">
      <ResponsiveContainer width="100%" height={256}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => FMT_EUR_ENTERO.format(Number(v))}
            width={70}
          />
          <Tooltip
            formatter={(v) => FMT_EUR_ENTERO.format(Number(v))}
            labelFormatter={(l) => String(l)}
          />
          <Legend />
          <Bar dataKey="gastos" name="Gastos" fill="hsl(var(--destructive))" />
          <Line
            type="monotone"
            dataKey="ingresos"
            name="Ingresos"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
