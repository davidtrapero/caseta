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
import { ToggleActivaCasetaForm } from "./_components/toggle-activa";
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { SortableHeader } from "@/components/ui/sortable-header";

export default async function CasetasPage({
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
    allowedSorts: ["nombre", "activa"],
  });

  // Construir orderBy dinámico
  let orderBy: any = [{ activa: "desc" }, { nombre: "asc" }];
  if (listParams.sort) {
    const direction = listParams.order ?? "asc";
    if (listParams.sort === "nombre") {
      orderBy = [{ nombre: direction }];
    } else if (listParams.sort === "activa") {
      orderBy = [{ activa: direction }, { nombre: "asc" }];
    }
  }

  const [casetas, total] = await Promise.all([
    prisma.caseta.findMany({
      orderBy,
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.caseta.count(),
  ]);

  return (
    <div>
      <SectionHeader
        title="Casetas"
        subtitle="Puntos de venta físicos. Transversales entre ediciones."
        actionHref="/admin/casetas/nueva"
        actionLabel="Nueva caseta"
        canAct={puedeEditar}
      />

      <div className="mb-4 flex items-center justify-between">
        <PageSizeSelect
          currentPageSize={listParams.pageSize}
          basePath="/admin/casetas"
        />
      </div>

      {casetas.length === 0 ? (
        <EmptyState
          title="Sin casetas registradas"
          description="Crea la primera caseta para empezar a asignar turnos y cierres."
          actionHref={puedeEditar ? "/admin/casetas/nueva" : undefined}
          actionLabel={puedeEditar ? "Crear caseta" : undefined}
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
                    basePath="/admin/casetas"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="w-40">
                  <SortableHeader
                    column="activa"
                    label="Estado"
                    basePath="/admin/casetas"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {casetas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.ubicacion ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ToggleActivaCasetaForm
                      id={c.id}
                      activa={c.activa}
                      disabled={!puedeEditar}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {puedeEditar ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/casetas/${c.id}`}>Editar</Link>
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
            basePath="/admin/casetas"
          />
        </>
      )}
    </div>
  );
}
