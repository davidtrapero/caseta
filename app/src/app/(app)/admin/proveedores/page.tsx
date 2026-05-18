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
import { SectionHeader, EmptyState } from "../_components/page-header";
import { ToggleActivoProveedorForm } from "./_components/toggle-activo";
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { SortableHeader } from "@/components/ui/sortable-header";

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeEditar = user.rol === "admin" || user.rol === "gerente";
  const sp = await searchParams;

  const listParams = parseListParams(sp, {
    defaultPageSize: 25,
    allowedPageSizes: [10, 25, 50, 100],
    allowedSorts: ["nombre"],
  });

  // Construir orderBy dinámico
  let orderBy: any = [{ activo: "desc" }, { nombre: "asc" }];
  if (listParams.sort) {
    const direction = listParams.order ?? "asc";
    if (listParams.sort === "nombre") {
      orderBy = [{ nombre: direction }];
    }
  }

  const [proveedores, total] = await Promise.all([
    prisma.proveedor.findMany({
      orderBy,
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.proveedor.count(),
  ]);

  return (
    <div>
      <SectionHeader
        title="Proveedores"
        subtitle="Empresas que suministran productos a las casetas."
        actionHref="/admin/proveedores/nuevo"
        actionLabel="Nuevo proveedor"
        canAct={puedeEditar}
      />

      <div className="mb-4 flex items-center justify-between">
        <PageSizeSelect
          currentPageSize={listParams.pageSize}
          basePath="/admin/proveedores"
        />
      </div>

      {proveedores.length === 0 ? (
        <EmptyState
          title="Sin proveedores registrados"
          description="Registra proveedores para empezar a crear pedidos."
          actionHref={puedeEditar ? "/admin/proveedores/nuevo" : undefined}
          actionLabel={puedeEditar ? "Crear proveedor" : undefined}
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
                    basePath="/admin/proveedores"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-40">Teléfono</TableHead>
                <TableHead className="w-32">Estado</TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proveedores.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.contacto ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.telefono ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ToggleActivoProveedorForm
                      id={p.id}
                      activo={p.activo}
                      disabled={!puedeEditar}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {puedeEditar ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/proveedores/${p.id}`}>Editar</Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Solo lectura</span>
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
            basePath="/admin/proveedores"
          />
        </>
      )}
    </div>
  );
}
