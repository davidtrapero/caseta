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
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { SortableHeader } from "@/components/ui/sortable-header";
import { FMT_EUR, FMT_FECHA } from "@/lib/intl";

const FORMATO_EUR = FMT_EUR;
const FORMATO_FECHA = FMT_FECHA;

function badgeEstado(estado: "pendiente" | "recibido" | "cancelado") {
  if (estado === "pendiente") return <Badge variant="outline">Pendiente</Badge>;
  if (estado === "recibido") return <Badge variant="active">Recibido</Badge>;
  return <Badge variant="inactive">Cancelado</Badge>;
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeCrear = user.rol === "admin" || user.rol === "gerente";
  const sp = await searchParams;

  const listParams = parseListParams(sp, {
    defaultPageSize: 25,
    allowedPageSizes: [10, 25, 50, 100],
    allowedSorts: ["fecha", "estado"],
  });

  const edicion = await obtenerEdicionActiva();
  if (!edicion) {
    return (
      <div>
        <SectionHeader
          title="Pedidos"
          subtitle="Pedidos a proveedor de la edición."
        />
        <EmptyState
          title="No hay edición activa"
          description="Activa una edición en Administración para registrar pedidos."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  // Construir orderBy dinámico
  let orderBy: any = [{ fechaPedido: "desc" }];
  if (listParams.sort) {
    const direction = listParams.order ?? "asc";
    if (listParams.sort === "fecha") {
      orderBy = [{ fechaPedido: direction }];
    } else if (listParams.sort === "estado") {
      orderBy = [{ estado: direction }, { fechaPedido: "desc" }];
    }
  }

  const [pedidos, total] = await Promise.all([
    prisma.pedido.findMany({
      where: { edicionId: edicion.id },
      include: {
        proveedor: { select: { nombre: true } },
        caseta: { select: { nombre: true } },
        detalles: { select: { id: true } },
      },
      orderBy,
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.pedido.count({
      where: { edicionId: edicion.id },
    }),
  ]);

  return (
    <div>
      <SectionHeader
        title={`Pedidos — ${edicion.nombre}`}
        subtitle="Órdenes de compra a proveedores. Al marcar como recibido, el stock se actualiza automáticamente."
        actionHref="/inventario/pedidos/nuevo"
        actionLabel="Nuevo pedido"
        canAct={puedeCrear}
      />

      <div className="mb-4 flex items-center justify-between">
        <PageSizeSelect
          currentPageSize={listParams.pageSize}
          basePath="/inventario/pedidos"
        />
      </div>

      {pedidos.length === 0 ? (
        <EmptyState
          title="Sin pedidos"
          description="Crea el primer pedido a proveedor."
          actionHref={puedeCrear ? "/inventario/pedidos/nuevo" : undefined}
          actionLabel={puedeCrear ? "Crear pedido" : undefined}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">
                  <SortableHeader
                    column="fecha"
                    label="Fecha"
                    basePath="/inventario/pedidos"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="w-40">Caseta</TableHead>
                <TableHead className="w-20 text-right">Líneas</TableHead>
                <TableHead className="w-32 text-right">Total</TableHead>
                <TableHead className="w-28">
                  <SortableHeader
                    column="estado"
                    label="Estado"
                    basePath="/inventario/pedidos"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">
                    {FORMATO_FECHA.format(p.fechaPedido)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.proveedor.nombre}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.caseta.nombre}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {p.detalles.length}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {FORMATO_EUR.format(Number(p.total))}
                  </TableCell>
                  <TableCell>{badgeEstado(p.estado)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/inventario/pedidos/${p.id}`}>
                        {p.estado === "pendiente" && puedeCrear ? "Gestionar" : "Ver"}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataTablePagination
            page={listParams.page}
            pageSize={listParams.pageSize}
            total={total}
            basePath="/inventario/pedidos"
          />
        </>
      )}
    </div>
  );
}
