import "server-only";

export type PuntoDia = {
  fecha: string;       // YYYY-MM-DD
  ingresos: number;
  gastos: number;
};

type CierreInput = { fecha: Date; ingresosTotales: { toString(): string } };
type GastoInput = { fecha: Date; monto: { toString(): string } };

/**
 * Construye una serie diaria continua (sin huecos entre min y max) con
 * ingresos y gastos por día. Si no hay datos, devuelve [].
 */
export function construirSerieDiaria(
  cierres: CierreInput[],
  gastos: GastoInput[]
): PuntoDia[] {
  const claves = new Set<string>();
  const ingresosByDia = new Map<string, number>();
  const gastosByDia = new Map<string, number>();

  for (const c of cierres) {
    const k = ymd(c.fecha);
    claves.add(k);
    ingresosByDia.set(k, (ingresosByDia.get(k) ?? 0) + Number(c.ingresosTotales));
  }
  for (const g of gastos) {
    const k = ymd(g.fecha);
    claves.add(k);
    gastosByDia.set(k, (gastosByDia.get(k) ?? 0) + Number(g.monto));
  }

  if (claves.size === 0) return [];

  const ordenadas = [...claves].sort();
  const min = ordenadas[0];
  const max = ordenadas[ordenadas.length - 1];

  const out: PuntoDia[] = [];
  for (let d = parseYmd(min); d <= parseYmd(max); d = addDay(d)) {
    const k = ymd(d);
    out.push({
      fecha: k,
      ingresos: round2(ingresosByDia.get(k) ?? 0),
      gastos: round2(gastosByDia.get(k) ?? 0),
    });
  }
  return out;
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function addDay(d: Date): Date {
  const n = new Date(d);
  n.setUTCDate(n.getUTCDate() + 1);
  return n;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
