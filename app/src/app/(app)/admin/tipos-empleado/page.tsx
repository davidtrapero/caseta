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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader, EmptyState } from "../_components/page-header";
import { colorFor } from "../../turnos/_lib/perfiles";
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { SortableHeader } from "@/components/ui/sortable-header";

export default async function TiposEmpleadoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;

  const listParams = parseListParams(sp, {
    defaultPageSize: 25,
    allowedPageSizes: [10, 25, 50, 100],
    allowedSorts: ["nombre", "orden"],
  });

  // Construir orderBy dinámico
  let orderBy: any = [{ orden: "asc" }];
  if (listParams.sort) {
    const direction = listParams.order ?? "asc";
    if (listParams.sort === "nombre") {
      orderBy = [{ label: direction }];
    } else if (listParams.sort === "orden") {
      orderBy = [{ orden: direction }];
    }
  }

  const [tipos, total] = await Promise.all([
    prisma.tipoEmpleado.findMany({
      orderBy,
      include: {
        _count: { select: { empleadoTipos: true, plazas: true } },
      },
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.tipoEmpleado.count(),
  ]);

  return (
    <div>
      <SectionHeader
        title="Tipos de personal"
        subtitle="Categorías editables (con color propio) que se aplican al personal y las plazas de turno."
        actionHref="/admin/tipos-empleado/nuevo"
        actionLabel="Nuevo tipo"
      />

      <div className="mb-4 flex items-center justify-between">
        <PageSizeSelect
          currentPageSize={listParams.pageSize}
          basePath="/admin/tipos-empleado"
        />
      </div>

      {tipos.length === 0 ? (
        <EmptyState
          title="Sin tipos de personal"
          description="Define las categorías (camarera/o, coordinación, voluntariado…) y sus colores."
          actionHref="/admin/tipos-empleado/nuevo"
          actionLabel="Crear tipo"
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">
                  <SortableHeader
                    column="orden"
                    label="Orden"
                    basePath="/admin/tipos-empleado"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead className="w-28">Color</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>
                  <SortableHeader
                    column="nombre"
                    label="Etiqueta"
                    basePath="/admin/tipos-empleado"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead className="w-24">Corta</TableHead>
                <TableHead className="w-28">Voluntario</TableHead>
                <TableHead className="w-24">Estado</TableHead>
                <TableHead className="w-24 text-right">Empleados</TableHead>
                <TableHead className="w-24 text-right">Plazas</TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tipos.map((t) => {
                const colores = colorFor(t);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.orden}</TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-2 rounded-sm border px-2 py-0.5 text-xs font-medium uppercase tracking-wider"
                        style={{
                          background: colores.bg,
                          borderColor: colores.border,
                          color: colores.text,
                        }}
                      >
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: t.colorHex }}
                        />
                        {t.colorHex}
                      </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{t.slug}</TableCell>
                  <TableCell className="font-medium">{t.label}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.labelCorto}
                  </TableCell>
                  <TableCell>
                    {t.esVoluntario ? (
                      <Badge variant="default">Sí</Badge>
                    ) : (
                      <Badge variant="muted">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.activo ? "active" : "inactive"}>
                      {t.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {t._count.empleadoTipos}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {t._count.plazas}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/tipos-empleado/${t.id}`}>Editar</Link>
                    </Button>
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
            basePath="/admin/tipos-empleado"
          />
        </>
      )}
    </div>
  );
}
