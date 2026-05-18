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
import {
  SectionHeader,
  EmptyState,
} from "../../admin/_components/page-header";
import { FiltroCaseta } from "../_lib/caseta-filtro";
import { ToggleActivoProductoForm } from "./_components/toggle-activo";
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { SortableHeader } from "@/components/ui/sortable-header";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ caseta?: string; [key: string]: string | undefined }>;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeEditar = user.rol === "admin" || user.rol === "gerente";
  const sp = await searchParams;
  const { caseta: filtroCaseta } = sp;

  const listParams = parseListParams(sp, {
    defaultPageSize: 25,
    allowedPageSizes: [10, 25, 50, 100],
    allowedSorts: ["nombre", "activo", "caseta"],
  });

  const casetas = await prisma.caseta.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  // Construir orderBy dinámico
  let orderBy: any = [{ activo: "desc" }, { caseta: { nombre: "asc" } }, { nombre: "asc" }];
  if (listParams.sort) {
    const direction = listParams.order ?? "asc";
    if (listParams.sort === "nombre") {
      orderBy = [{ nombre: direction }];
    } else if (listParams.sort === "activo") {
      orderBy = [{ activo: direction }, { nombre: "asc" }];
    } else if (listParams.sort === "caseta") {
      orderBy = [{ caseta: { nombre: direction } }, { nombre: "asc" }];
    }
  }

  const [productos, total] = await Promise.all([
    prisma.producto.findMany({
      where: filtroCaseta ? { casetaId: filtroCaseta } : {},
      include: { caseta: { select: { nombre: true } } },
      orderBy,
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.producto.count({
      where: filtroCaseta ? { casetaId: filtroCaseta } : {},
    }),
  ]);

  const nuevoHref = filtroCaseta
    ? `/inventario/productos/nuevo?caseta=${filtroCaseta}`
    : "/inventario/productos/nuevo";

  return (
    <div>
      <SectionHeader
        title="Productos"
        subtitle="Catálogo de productos por caseta. Un producto desactivado no se borra — queda oculto."
        actionHref={nuevoHref}
        actionLabel="Nuevo producto"
        canAct={puedeEditar}
      />

      <FiltroCaseta
        base="/inventario/productos"
        casetas={casetas}
        activo={filtroCaseta}
      />

      <div className="mb-4 flex items-center justify-between">
        <PageSizeSelect
          currentPageSize={listParams.pageSize}
          basePath="/inventario/productos"
          queryParams={filtroCaseta ? `caseta=${filtroCaseta}` : ""}
        />
      </div>

      {productos.length === 0 ? (
        <EmptyState
          title="Sin productos"
          description={
            filtroCaseta
              ? "Esta caseta aún no tiene productos en el catálogo."
              : "Crea el primer producto para empezar a gestionar el inventario."
          }
          actionHref={puedeEditar ? nuevoHref : undefined}
          actionLabel={puedeEditar ? "Crear producto" : undefined}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    column="nombre"
                    label="Nombre"
                    basePath="/inventario/productos"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                    queryParams={filtroCaseta ? `caseta=${filtroCaseta}` : ""}
                  />
                </TableHead>
                <TableHead className="w-40">
                  <SortableHeader
                    column="caseta"
                    label="Caseta"
                    basePath="/inventario/productos"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                    queryParams={filtroCaseta ? `caseta=${filtroCaseta}` : ""}
                  />
                </TableHead>
                <TableHead className="w-32">Unidad</TableHead>
                <TableHead className="w-32">
                  <SortableHeader
                    column="activo"
                    label="Estado"
                    basePath="/inventario/productos"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                    queryParams={filtroCaseta ? `caseta=${filtroCaseta}` : ""}
                  />
                </TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.caseta.nombre}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.unidad}
                  </TableCell>
                  <TableCell>
                    <ToggleActivoProductoForm
                      id={p.id}
                      activo={p.activo}
                      disabled={!puedeEditar}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {puedeEditar ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/inventario/productos/${p.id}`}>Editar</Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Solo lectura
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataTablePagination
            page={listParams.page}
            pageSize={listParams.pageSize}
            total={total}
            basePath="/inventario/productos"
            queryParams={filtroCaseta ? `caseta=${filtroCaseta}` : ""}
          />
        </>
      )}
    </div>
  );
}
