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

const FORMATO_EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export default async function BalancePage() {
  await requireRole(["admin", "gerente", "cajero"]);

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

  const [
    ingresosAgg,
    gastosAgg,
    nominasAgg,
    gastosPorCategoria,
    ingresosPorCaseta,
    nominasDetalle,
  ] = await Promise.all([
    prisma.cierreDiario.aggregate({
      where: { edicionId: edicion.id },
      _sum: { ingresosTotales: true },
      _count: { _all: true },
    }),
    prisma.gasto.aggregate({
      where: { edicionId: edicion.id },
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
      where: { edicionId: edicion.id },
      _sum: { monto: true },
      _count: { _all: true },
    }),
    prisma.cierreDiario.groupBy({
      by: ["casetaId"],
      where: { edicionId: edicion.id },
      _sum: { ingresosTotales: true },
    }),
    prisma.nomina.findMany({
      where: { edicionId: edicion.id },
      include: {
        empleado: { select: { nombre: true } },
      },
      orderBy: { total: "desc" },
    }),
  ]);

  const ingresos = Number(ingresosAgg._sum.ingresosTotales ?? 0);
  const gastos = Number(gastosAgg._sum.monto ?? 0);
  const nominas = Number(nominasAgg._sum.total ?? 0);
  const resultado = ingresos - gastos - nominas;

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

  return (
    <div>
      <SectionHeader
        title={`Balance — ${edicion.nombre}`}
        subtitle="Cierres, gastos y nóminas acumulados."
      />

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
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Nóminas por empleado
        </h3>
        {nominasDetalle.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/40 p-6 text-center text-sm text-muted-foreground">
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
