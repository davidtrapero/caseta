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
import {
  BotonBloquear,
  BotonDesbloquear,
  BotonEliminar,
} from "./_components/acciones-cierre";
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { SortableHeader } from "@/components/ui/sortable-header";
import { FMT_EUR, FMT_FECHA_UTC } from "@/lib/intl";

export default async function CierresPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeCrear = true;
  const esAdmin = user.rol === "admin";
  const puedeBloquear = user.rol === "admin" || user.rol === "gerente";
  const sp = await searchParams;

  const listParams = parseListParams(sp, {
    defaultPageSize: 25,
    allowedPageSizes: [10, 25, 50, 100],
    allowedSorts: ["fecha", "caseta"],
  });

  const edicion = await obtenerEdicionActiva();

  if (!edicion) {
    return (
      <div>
        <SectionHeader
          title="Cierres diarios"
          subtitle="Ingresos totales por caseta y día."
        />
        <EmptyState
          title="No hay edición activa"
          description="Activa una edición en Administración para registrar cierres."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  // Construir orderBy dinámico
  let orderBy: any = [{ fecha: "desc" }, { caseta: { nombre: "asc" } }];
  if (listParams.sort) {
    const direction = listParams.order ?? "asc";
    if (listParams.sort === "fecha") {
      orderBy = [{ fecha: direction }, { caseta: { nombre: "asc" } }];
    } else if (listParams.sort === "caseta") {
      orderBy = [{ caseta: { nombre: direction } }, { fecha: "desc" }];
    }
  }

  const [cierres, total] = await Promise.all([
    prisma.cierreDiario.findMany({
      where: { edicionId: edicion.id },
      include: { caseta: { select: { nombre: true } } },
      orderBy,
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.cierreDiario.count({
      where: { edicionId: edicion.id },
    }),
  ]);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <SectionHeader
          title={`Cierres — ${edicion.nombre}`}
          subtitle="Ingresos diarios por caseta. Bloqueado = solo admin edita."
          actionHref="/caja/cierres/nuevo"
          actionLabel="Nuevo cierre"
          canAct={puedeCrear}
        />
        <Button asChild variant="outline">
          <Link href="/caja/cierres/exportar" prefetch={false}>
            Exportar Excel
          </Link>
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <PageSizeSelect
          currentPageSize={listParams.pageSize}
          basePath="/caja/cierres"
        />
      </div>

      {cierres.length === 0 ? (
        <EmptyState
          title="Sin cierres registrados"
          description="Registra el primer cierre del día para una caseta."
          actionHref="/caja/cierres/nuevo"
          actionLabel="Crear cierre"
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">
                  <SortableHeader
                    column="fecha"
                    label="Fecha"
                    basePath="/caja/cierres"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    column="caseta"
                    label="Caseta"
                    basePath="/caja/cierres"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead className="w-40 text-right">Ingresos</TableHead>
                <TableHead className="w-28">Estado</TableHead>
                <TableHead className="w-60 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cierres.map((c) => {
                const importe = Number(c.ingresosTotales);
                const puedeEditar = !c.bloqueado || esAdmin;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      {FMT_FECHA_UTC.format(c.fecha)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.caseta.nombre}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {FMT_EUR.format(importe)}
                    </TableCell>
                    <TableCell>
                      {c.bloqueado ? (
                        <Badge variant="warning">Bloqueado</Badge>
                      ) : (
                        <Badge variant="success">Abierto</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-3">
                        {puedeEditar ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/caja/cierres/${c.id}`}>Editar</Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/caja/cierres/${c.id}`}>Ver</Link>
                          </Button>
                        )}
                        {!c.bloqueado && puedeBloquear ? (
                          <BotonBloquear id={c.id} />
                        ) : null}
                        {c.bloqueado && esAdmin ? (
                          <BotonDesbloquear id={c.id} />
                        ) : null}
                        {esAdmin ? <BotonEliminar id={c.id} /> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <DataTablePagination
            page={listParams.page}
            pageSize={listParams.pageSize}
            total={total}
            basePath="/caja/cierres"
          />
        </>
      )}
    </div>
  );
}
