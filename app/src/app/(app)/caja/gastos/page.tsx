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
import { obtenerEdicionActiva } from "@/lib/edicion";
import { CATEGORIA_LABEL, type CategoriaGasto } from "./_lib/categorias";
import { BotonEliminarGasto } from "./_components/boton-eliminar";
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { SortableHeader } from "@/components/ui/sortable-header";
import { FMT_EUR, FMT_FECHA_UTC } from "@/lib/intl";

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ caseta?: string; [key: string]: string | undefined }>;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const esAdmin = user.rol === "admin";
  const sp = await searchParams;
  const { caseta: filtroCaseta } = sp;

  const listParams = parseListParams(sp, {
    defaultPageSize: 25,
    allowedPageSizes: [10, 25, 50, 100],
    allowedSorts: ["fecha", "caseta", "monto"],
  });

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

  // Construir orderBy dinámico
  let orderBy: any = [{ fecha: "desc" }, { createdAt: "desc" }];
  if (listParams.sort) {
    const direction = listParams.order ?? "asc";
    if (listParams.sort === "fecha") {
      orderBy = [{ fecha: direction }, { createdAt: "desc" }];
    } else if (listParams.sort === "caseta") {
      orderBy = [{ caseta: { nombre: direction } }, { fecha: "desc" }];
    } else if (listParams.sort === "monto") {
      orderBy = [{ monto: direction }, { fecha: "desc" }];
    }
  }

  const [gastos, total] = await Promise.all([
    prisma.gasto.findMany({
      where: { edicionId: edicion.id, ...filtroWhere },
      include: { caseta: { select: { nombre: true } } },
      orderBy,
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.gasto.count({
      where: { edicionId: edicion.id, ...filtroWhere },
    }),
  ]);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <SectionHeader
          title={`Gastos — ${edicion.nombre}`}
          subtitle="Gastos de la edición. Sin caseta = transversales."
          actionHref="/caja/gastos/nuevo"
          actionLabel="Nuevo gasto"
        />
        <Button asChild variant="outline">
          <Link
            href={filtroCaseta ? `/caja/gastos/exportar?caseta=${filtroCaseta}` : "/caja/gastos/exportar"}
            prefetch={false}
          >
            Exportar Excel
          </Link>
        </Button>
      </div>

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

      <div className="mb-4 flex items-center justify-between">
        <PageSizeSelect
          currentPageSize={listParams.pageSize}
          basePath="/caja/gastos"
          queryParams={filtroCaseta ? `caseta=${filtroCaseta}` : ""}
        />
      </div>

      {gastos.length === 0 ? (
        <EmptyState
          title="Sin gastos registrados"
          description="Registra el primer gasto de la edición."
          actionHref="/caja/gastos/nuevo"
          actionLabel="Crear gasto"
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">
                  <SortableHeader
                    column="fecha"
                    label="Fecha"
                    basePath="/caja/gastos"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                    queryParams={filtroCaseta ? `caseta=${filtroCaseta}` : ""}
                  />
                </TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-32">Categoría</TableHead>
                <TableHead className="w-40">
                  <SortableHeader
                    column="caseta"
                    label="Caseta"
                    basePath="/caja/gastos"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                    queryParams={filtroCaseta ? `caseta=${filtroCaseta}` : ""}
                  />
                </TableHead>
                <TableHead className="w-32 text-right">
                  <SortableHeader
                    column="monto"
                    label="Monto"
                    basePath="/caja/gastos"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                    queryParams={filtroCaseta ? `caseta=${filtroCaseta}` : ""}
                  />
                </TableHead>
                <TableHead className="w-40 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-mono text-xs">
                    {FMT_FECHA_UTC.format(g.fecha)}
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
                    {FMT_EUR.format(Number(g.monto))}
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
          <DataTablePagination
            page={listParams.page}
            pageSize={listParams.pageSize}
            total={total}
            basePath="/caja/gastos"
            queryParams={filtroCaseta ? `caseta=${filtroCaseta}` : ""}
          />
        </>
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
          ? "inline-flex items-center rounded-full border border-[var(--surface-glass-border)] bg-[hsl(var(--primary)/0.2)] px-2 py-0.5 text-xs font-medium text-primary"
          : "inline-flex items-center rounded-full border border-[var(--surface-glass-border)] bg-transparent px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}
