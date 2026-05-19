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
import { SectionHeader, EmptyState } from "../_components/page-header";
import {
  CrearEntidadForm,
  RenombrarEntidadForm,
} from "./_components/entidad-form";
import { ToggleActivaEntidadForm } from "./_components/toggle-activa";
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { SortableHeader } from "@/components/ui/sortable-header";

export default async function EntidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  await requireRole(["admin", "gerente"]);
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

  const [entidades, total] = await Promise.all([
    prisma.entidadVoluntario.findMany({
      orderBy,
      include: {
        _count: {
          select: { empleados: true, solicitudes: true },
        },
      },
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.entidadVoluntario.count(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Entidades de personas voluntarias"
        subtitle="Entidades a las que pertenecen las personas voluntarias. Las inactivas no aparecen en el formulario público pero conservan sus referencias."
      />

      <section className="rounded-lg border bg-card p-6">
        <h3 className="text-sm font-medium mb-4">Crear nueva entidad</h3>
        <CrearEntidadForm />
      </section>

      {entidades.length === 0 ? (
        <EmptyState
          title="Sin entidades registradas"
          description="Crea al menos una entidad para poder publicar el formulario público de personas voluntarias."
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <PageSizeSelect
              currentPageSize={listParams.pageSize}
              basePath="/admin/entidades"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    column="nombre"
                    label="Nombre"
                    basePath="/admin/entidades"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead className="w-32 text-right">Personal</TableHead>
                <TableHead className="w-32 text-right">Solicitudes</TableHead>
                <TableHead className="w-32">
                  <SortableHeader
                    column="activa"
                    label="Estado"
                    basePath="/admin/entidades"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entidades.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <RenombrarEntidadForm id={e.id} nombreActual={e.nombre} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {e._count.empleados}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {e._count.solicitudes}
                  </TableCell>
                  <TableCell>
                    <ToggleActivaEntidadForm id={e.id} activa={e.activa} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataTablePagination
            page={listParams.page}
            pageSize={listParams.pageSize}
            total={total}
            basePath="/admin/entidades"
          />
        </>
      )}
    </div>
  );
}
