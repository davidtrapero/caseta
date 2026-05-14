import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  SectionHeader,
  EmptyState,
} from "../../admin/_components/page-header";
import { obtenerEdicionActiva } from "@/lib/edicion";
import {
  CATEGORIA_LABEL,
  type CategoriaGasto,
} from "../gastos/_lib/categorias";
import { construirSerieDiaria } from "./_lib/series";
import { SelectorCasetaBalance } from "./_components/SelectorCasetaBalance";
import { GraficoDiario } from "./_components/GraficoDiario";

const FORMATO_EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<{ casetaId?: string }>;
}) {
  await requireRole(["admin", "gerente", "cajero"]);

  const sp = await searchParams;
  const casetaIdSeleccionada = sp.casetaId ?? "";

  const edicion = await obtenerEdicionActiva();
  if (!edicion) {
    return (
      <div>
        <SectionHeader title="Balance" subtitle="Resumen económico de la edición." />
        <EmptyState
          title="No hay edición activa"
          description="Activa una edición en Administración para ver el balance."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  const whereCierres = {
    edicionId: edicion.id,
    ...(casetaIdSeleccionada ? { casetaId: casetaIdSeleccionada } : {}),
  };
  const whereGastos = {
    edicionId: edicion.id,
    ...(casetaIdSeleccionada
      ? { OR: [{ casetaId: casetaIdSeleccionada }, { casetaId: null }] }
      : {}),
  };

  const [
    ingresosAgg,
    gastosAgg,
    nominasAgg,
    gastosPorCategoria,
    ingresosPorCaseta,
    nominasDetalle,
    cierresParaSerie,
    gastosParaSerie,
    casetasTodas,
  ] = await Promise.all([
    prisma.cierreDiario.aggregate({
      where: whereCierres,
      _sum: { ingresosTotales: true },
      _count: { _all: true },
    }),
    prisma.gasto.aggregate({
      where: whereGastos,
      _sum: { monto: true },
      _count: { _all: true },
    }),
    prisma.nomina.aggregate({
      where: { edicionId: edicion.id },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.gasto.groupBy({
      by: ["categoria"],
      where: whereGastos,
      _sum: { monto: true },
      _count: { _all: true },
    }),
    prisma.cierreDiario.groupBy({
      by: ["casetaId"],
      where: whereCierres,
      _sum: { ingresosTotales: true },
    }),
    prisma.nomina.findMany({
      where: { edicionId: edicion.id },
      include: {
        empleado: { select: { nombre: true } },
      },
      orderBy: { total: "desc" },
    }),
    prisma.cierreDiario.findMany({
      where: whereCierres,
      select: { fecha: true, ingresosTotales: true },
    }),
    prisma.gasto.findMany({
      where: whereGastos,
      select: { fecha: true, monto: true },
    }),
    prisma.caseta.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const ingresos = Number(ingresosAgg._sum.ingresosTotales ?? 0);
  const gastos = Number(gastosAgg._sum.monto ?? 0);
  const nominas = Number(nominasAgg._sum.total ?? 0);
  const resultado = ingresos - gastos - nominas;

  const serieDiaria = construirSerieDiaria(cierresParaSerie, gastosParaSerie);

  // Mapa de casetas para el desglose por caseta.
  const casetaIds = ingresosPorCaseta
    .map((r) => r.casetaId)
    .filter((id): id is string => Boolean(id));
  const casetas = casetaIds.length
    ? await prisma.caseta.findMany({
        where: { id: { in: casetaIds } },
        select: { id: true, nombre: true },
      })
    : [];
  const nombreCaseta = new Map(casetas.map((c) => [c.id, c.nombre]));

  const hayFiltro = casetaIdSeleccionada !== "";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionHeader
            title={`Balance — ${edicion.nombre}`}
            subtitle="Cierres, gastos y nóminas acumulados."
          />
          {hayFiltro ? (
            <Badge variant="muted" className="mt-1">
              incluye gastos generales
            </Badge>
          ) : null}
        </div>
        <SelectorCasetaBalance
          casetas={casetasTodas}
          casetaId={casetaIdSeleccionada}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <BalanceCard
          label="Ingresos"
          valor={ingresos}
          nota={`${ingresosAgg._count._all} cierres`}
          tono="positivo"
        />
        <BalanceCard
          label="Gastos"
          valor={gastos}
          nota={`${gastosAgg._count._all} registros`}
          tono="negativo"
        />
        <BalanceCard
          label="Nóminas"
          valor={nominas}
          nota={`${nominasAgg._count._all} empleados`}
          tono="negativo"
        />
        <BalanceCard
          label="Resultado neto"
          valor={resultado}
          nota="Ingresos − Gastos − Nóminas"
          tono={resultado >= 0 ? "destacado" : "alerta"}
        />
      </div>

      <section className="mb-6">
        <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-primary">
          Movimiento diario
        </h3>
        <GraficoDiario data={serieDiaria} />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-primary">
            Ingresos por caseta
          </h3>
          {ingresosPorCaseta.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--surface-glass-border)] bg-[var(--surface-glass)] p-6 text-center text-sm text-muted-foreground">
              Sin cierres registrados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caseta</TableHead>
                  <TableHead className="w-36 text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingresosPorCaseta
                  .slice()
                  .sort(
                    (a, b) =>
                      Number(b._sum.ingresosTotales ?? 0) -
                      Number(a._sum.ingresosTotales ?? 0)
                  )
                  .map((r) => (
                    <TableRow key={r.casetaId ?? "null"}>
                      <TableCell className="font-medium">
                        {nombreCaseta.get(r.casetaId) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {FORMATO_EUR.format(
                          Number(r._sum.ingresosTotales ?? 0)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-primary">
            Gastos por categoría
          </h3>
          {gastosPorCategoria.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--surface-glass-border)] bg-[var(--surface-glass)] p-6 text-center text-sm text-muted-foreground">
              Sin gastos registrados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="w-16 text-right">Nº</TableHead>
                  <TableHead className="w-32 text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gastosPorCategoria
                  .slice()
                  .sort(
                    (a, b) =>
                      Number(b._sum.monto ?? 0) - Number(a._sum.monto ?? 0)
                  )
                  .map((r) => (
                    <TableRow key={r.categoria}>
                      <TableCell>
                        <Badge variant="muted">
                          {CATEGORIA_LABEL[r.categoria as CategoriaGasto] ??
                            r.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {r._count._all}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {FORMATO_EUR.format(Number(r._sum.monto ?? 0))}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-primary">
          Nóminas por empleado
        </h3>
        {hayFiltro ? (
          <p className="mb-3 text-xs text-muted-foreground">
            Total nóminas (no filtra por caseta)
          </p>
        ) : null}
        {nominasDetalle.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--surface-glass-border)] bg-[var(--surface-glass)] p-6 text-center text-sm text-muted-foreground">
            Sin nóminas calculadas.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead className="w-24 text-right">Días</TableHead>
                <TableHead className="w-32 text-right">Jornal</TableHead>
                <TableHead className="w-36 text-right">Total</TableHead>
                <TableHead className="w-28">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nominasDetalle.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">
                    {n.empleado.nombre}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {n.diasTrabajados}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {FORMATO_EUR.format(Number(n.jornalAplicado))}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {FORMATO_EUR.format(Number(n.total))}
                  </TableCell>
                  <TableCell>
                    {n.pagada ? (
                      <Badge variant="active">Pagada</Badge>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

type Tono = "positivo" | "negativo" | "destacado" | "alerta";

function BalanceCard({
  label,
  valor,
  nota,
  tono,
}: {
  label: string;
  valor: number;
  nota: string;
  tono: Tono;
}) {
  const valorClase =
    tono === "destacado"
      ? "text-primary"
      : tono === "alerta"
        ? "text-destructive-foreground"
        : tono === "negativo"
          ? "text-muted-foreground"
          : "text-foreground";

  return (
    <div
      className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4"
      style={{ boxShadow: "var(--surface-glass-shadow)" }}
    >
      <p className="text-[10px] uppercase tracking-widest text-primary">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums leading-none ${valorClase}`}>
        {FORMATO_EUR.format(valor)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{nota}</p>
    </div>
  );
}
