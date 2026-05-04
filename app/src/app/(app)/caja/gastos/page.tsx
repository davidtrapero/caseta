import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SectionHeader,
  EmptyState,
} from "../../admin/_components/page-header";
import { obtenerEdicionActiva } from "../_lib/edicion-activa";
import { CATEGORIA_LABEL, type CategoriaGasto } from "./_lib/categorias";
import { BotonEliminarGasto } from "./_components/boton-eliminar";

const FORMATO_EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ caseta?: string }>;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const esAdmin = user.rol === "admin";
  const { caseta: filtroCaseta } = await searchParams;

  const edicion = await obtenerEdicionActiva();

  if (!edicion) {
    return (
      <div>
        <SectionHeader title="Gastos" subtitle="Registro de gastos de la edición." />
        <EmptyState
          title="No hay edición activa"
          description="Activa una edición en Administración para registrar gastos."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  const casetas = await prisma.caseta.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  const filtroWhere =
    filtroCaseta === "central"
      ? { casetaId: null }
      : filtroCaseta
        ? { casetaId: filtroCaseta }
        : {};

  const gastos = await prisma.gasto.findMany({
    where: { edicionId: edicion.id, ...filtroWhere },
    include: { caseta: { select: { nombre: true } } },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <SectionHeader
        title={`Gastos — ${edicion.nombre}`}
        subtitle="Registro de gastos operativos. Los gastos sin caseta son transversales a la edición."
        actionHref="/caja/gastos/nuevo"
        actionLabel="Nuevo gasto"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Filtrar:
        </span>
        <FiltroChip href="/caja/gastos" label="Todos" activo={!filtroCaseta} />
        <FiltroChip
          href="/caja/gastos?caseta=central"
          label="Centralizados"
          activo={filtroCaseta === "central"}
        />
        {casetas.map((c) => (
          <FiltroChip
            key={c.id}
            href={`/caja/gastos?caseta=${c.id}`}
            label={c.nombre}
            activo={filtroCaseta === c.id}
          />
        ))}
      </div>

      {gastos.length === 0 ? (
        <EmptyState
          title="Sin gastos registrados"
          description="Registra el primer gasto de la edición."
          actionHref="/caja/gastos/nuevo"
          actionLabel="Crear gasto"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-32">Categoría</TableHead>
              <TableHead className="w-40">Caseta</TableHead>
              <TableHead className="w-32 text-right">Monto</TableHead>
              <TableHead className="w-40 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gastos.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-mono text-xs">
                  {FORMATO_FECHA.format(g.fecha)}
                </TableCell>
                <TableCell className="font-medium">{g.descripcion}</TableCell>
                <TableCell>
                  <Badge variant="muted">
                    {CATEGORIA_LABEL[g.categoria as CategoriaGasto] ?? g.categoria}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {g.caseta ? (
                    g.caseta.nombre
                  ) : (
                    <span className="italic">Centralizado</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {FORMATO_EUR.format(Number(g.monto))}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-3">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/caja/gastos/${g.id}`}>Editar</Link>
                    </Button>
                    {esAdmin ? <BotonEliminarGasto id={g.id} /> : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function FiltroChip({
  href,
  label,
  activo,
}: {
  href: string;
  label: string;
  activo: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        activo
          ? "inline-flex items-center rounded-sm border border-primary/50 bg-primary/20 px-2 py-0.5 text-xs font-medium"
          : "inline-flex items-center rounded-sm border border-border bg-transparent px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}
