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
import {
  SectionHeader,
  EmptyState,
} from "../../admin/_components/page-header";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { BotonCalcular } from "./_components/boton-calcular";
import {
  BotonMarcarPagada,
  BotonDesmarcarPagada,
} from "./_components/acciones-nomina";
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { SortableHeader } from "@/components/ui/sortable-header";
import { FMT_EUR, FMT_FECHA_UTC } from "@/lib/intl";

const FORMATO_EUR = FMT_EUR;
const FORMATO_FECHA = FMT_FECHA_UTC;

export default async function NominasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const esAdmin = user.rol === "admin";
  const puedeCalcular = user.rol === "admin" || user.rol === "gerente";
  const sp = await searchParams;

  const listParams = parseListParams(sp, {
    defaultPageSize: 25,
    allowedPageSizes: [10, 25, 50, 100],
    allowedSorts: ["pagada", "nombre"],
  });

  const edicion = await obtenerEdicionActiva();

  if (!edicion) {
    return (
      <div>
        <SectionHeader
          title="Nóminas"
          subtitle="Nóminas de la edición."
        />
        <EmptyState
          title="No hay edición activa"
          description="Activa una edición en Administración para calcular nóminas."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  // Construir orderBy dinámico
  let orderBy: any = [{ pagada: "asc" }, { empleado: { nombre: "asc" } }];
  if (listParams.sort) {
    const direction = listParams.order ?? "asc";
    if (listParams.sort === "pagada") {
      orderBy = [{ pagada: direction }, { empleado: { nombre: "asc" } }];
    } else if (listParams.sort === "nombre") {
      orderBy = [{ empleado: { nombre: direction } }];
    }
  }

  const [nominas, total] = await Promise.all([
    prisma.nomina.findMany({
      where: { edicionId: edicion.id },
      include: {
        empleado: {
          select: { id: true, nombre: true, activo: true },
        },
      },
      orderBy,
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.nomina.count({
      where: { edicionId: edicion.id },
    }),
  ]);

  // Bloqueo para gerente si hay pagadas.
  const hayPagadas = nominas.some((n) => n.pagada);
  const bloqueadoParaEsteUsuario = hayPagadas && !esAdmin;

  const totalEdicion = nominas.reduce((acc, n) => acc + Number(n.total), 0);
  const totalPagado = nominas
    .filter((n) => n.pagada)
    .reduce((acc, n) => acc + Number(n.total), 0);
  const totalPendiente = totalEdicion - totalPagado;

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <SectionHeader
          title={`Nóminas — ${edicion.nombre}`}
          subtitle="Nóminas de la edición."
        />
        <Button asChild variant="outline">
          <Link href="/caja/nominas/exportar" prefetch={false}>
            Exportar Excel
          </Link>
        </Button>
      </div>

      {puedeCalcular ? (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <BotonCalcular bloqueado={bloqueadoParaEsteUsuario} />
        </div>
      ) : null}

      {nominas.length === 0 ? (
        <EmptyState
          title="Sin nóminas calculadas"
          description={
            puedeCalcular
              ? "Pulsa 'Calcular nóminas' para generar las nóminas del personal con asistencia registrada."
              : "Aún no se han calculado las nóminas de esta edición."
          }
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <ResumenCard label="Total edición" valor={totalEdicion} />
            <ResumenCard label="Pagado" valor={totalPagado} />
            <ResumenCard label="Pendiente" valor={totalPendiente} destacar />
          </div>

          <div className="mb-4 flex items-center justify-between">
            <PageSizeSelect
              currentPageSize={listParams.pageSize}
              basePath="/caja/nominas"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    column="nombre"
                    label="Personal"
                    basePath="/caja/nominas"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead className="w-24 text-right">Días</TableHead>
                <TableHead className="w-32 text-right">Jornal</TableHead>
                <TableHead className="w-36 text-right">Total</TableHead>
                <TableHead className="w-32">
                  <SortableHeader
                    column="pagada"
                    label="Estado"
                    basePath="/caja/nominas"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead className="w-32">Pago</TableHead>
                <TableHead className="w-40 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nominas.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">
                    {n.empleado.nombre}
                    {!n.empleado.activo ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (inactivo)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {n.diasTrabajados}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {FORMATO_EUR.format(Number(n.jornalAplicado))}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {FORMATO_EUR.format(Number(n.total))}
                  </TableCell>
                  <TableCell>
                    {n.pagada ? (
                      <Badge variant="active">Pagada</Badge>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {n.fechaPago ? FORMATO_FECHA.format(n.fechaPago) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-3">
                      {esAdmin && !n.pagada ? (
                        <BotonMarcarPagada id={n.id} />
                      ) : null}
                      {esAdmin && n.pagada ? (
                        <BotonDesmarcarPagada id={n.id} />
                      ) : null}
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
            basePath="/caja/nominas"
          />
        </>
      )}
    </div>
  );
}

function ResumenCard({
  label,
  valor,
  destacar,
}: {
  label: string;
  valor: number;
  destacar?: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4"
      style={{ boxShadow: "var(--surface-glass-shadow)" }}
    >
      <p className="text-xs uppercase tracking-wider text-primary">
        {label}
      </p>
      <p
        className={
          destacar
            ? "mt-1 font-mono text-2xl font-medium text-primary"
            : "mt-1 font-mono text-2xl"
        }
      >
        {FORMATO_EUR.format(valor)}
      </p>
    </div>
  );
}
