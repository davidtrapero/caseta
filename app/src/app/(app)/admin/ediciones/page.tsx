import Link from "next/link";
import { headers } from "next/headers";
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
import { ToggleActivaForm } from "./_components/toggle-activa";
import { PublicarFormulario } from "./_components/publicar-formulario";
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { SortableHeader } from "@/components/ui/sortable-header";
import { FMT_FECHA } from "@/lib/intl";

export default async function EdicionesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeEditar = user.rol === "admin";
  const puedePublicar = user.rol === "admin" || user.rol === "gerente";
  const sp = await searchParams;

  const listParams = parseListParams(sp, {
    defaultPageSize: 25,
    allowedPageSizes: [10, 25, 50, 100],
    allowedSorts: ["nombre", "activa", "año"],
  });

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  // Construir orderBy dinámico
  let orderBy: any = [{ activa: "desc" }, { anio: "desc" }];
  if (listParams.sort) {
    const direction = listParams.order ?? "asc";
    if (listParams.sort === "nombre") {
      orderBy = [{ nombre: direction }];
    } else if (listParams.sort === "activa") {
      orderBy = [{ activa: direction }, { anio: "desc" }];
    } else if (listParams.sort === "año") {
      orderBy = [{ anio: direction }];
    }
  }

  const [ediciones, total] = await Promise.all([
    prisma.edicion.findMany({
      orderBy,
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.edicion.count(),
  ]);

  return (
    <div>
      <SectionHeader
        title="Ediciones de San Isidro"
        subtitle="Cada año es una edición. Pueden coexistir varias marcadas como activas."
        actionHref="/admin/ediciones/nueva"
        actionLabel="Nueva edición"
        canAct={puedeEditar}
      />

      <div className="mb-4 flex items-center justify-between">
        <PageSizeSelect
          currentPageSize={listParams.pageSize}
          basePath="/admin/ediciones"
        />
      </div>

      {ediciones.length === 0 ? (
        <EmptyState
          title="Sin ediciones registradas"
          description="Crea la primera edición para empezar a asignar turnos, cierres y gastos."
          actionHref={puedeEditar ? "/admin/ediciones/nueva" : undefined}
          actionLabel={puedeEditar ? "Crear edición" : undefined}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">
                  <SortableHeader
                    column="año"
                    label="Año"
                    basePath="/admin/ediciones"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    column="nombre"
                    label="Nombre"
                    basePath="/admin/ediciones"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead className="w-32">
                  <SortableHeader
                    column="activa"
                    label="Estado"
                    basePath="/admin/ediciones"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead>Formulario público</TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ediciones.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono">{e.anio}</TableCell>
                  <TableCell className="font-medium">{e.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {FMT_FECHA.format(e.fechaInicio)} — {FMT_FECHA.format(e.fechaFin)}
                  </TableCell>
                  <TableCell>
                    <ToggleActivaForm
                      id={e.id}
                      activa={e.activa}
                      disabled={!puedeEditar}
                    />
                  </TableCell>
                  <TableCell>
                    <PublicarFormulario
                      edicionId={e.id}
                      token={e.formularioToken}
                      baseUrl={baseUrl}
                      disabled={!puedePublicar}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {puedeEditar ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/ediciones/${e.id}`}>Editar</Link>
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
            basePath="/admin/ediciones"
          />
        </>
      )}
    </div>
  );
}
