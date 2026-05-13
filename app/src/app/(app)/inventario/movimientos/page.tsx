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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  SectionHeader,
  EmptyState,
} from "../../admin/_components/page-header";
import { obtenerEdicionActiva } from "@/lib/edicion";
import type { TipoMovimiento } from "@prisma/client";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function ymdToUtcDate(ymd: string, fin = false): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(
    Date.UTC(y, m - 1, d, fin ? 23 : 0, fin ? 59 : 0, fin ? 59 : 0, fin ? 999 : 0)
  );
}

function parseTipo(v?: string): TipoMovimiento | undefined {
  return v === "entrada" || v === "ajuste" ? v : undefined;
}

type SearchParams = {
  caseta?: string;
  producto?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
};

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(["admin", "gerente", "cajero"]);
  const sp = await searchParams;

  const edicion = await obtenerEdicionActiva();
  if (!edicion) {
    return (
      <div>
        <SectionHeader
          title="Movimientos"
          subtitle="Historial de entradas y ajustes de stock."
        />
        <EmptyState
          title="No hay edición activa"
          description="Activa una edición para ver los movimientos."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  const tipo = parseTipo(sp.tipo);
  const desde =
    sp.desde && FECHA_RE.test(sp.desde) ? ymdToUtcDate(sp.desde) : undefined;
  const hasta =
    sp.hasta && FECHA_RE.test(sp.hasta)
      ? ymdToUtcDate(sp.hasta, true)
      : undefined;

  const [casetas, productos, movimientos] = await Promise.all([
    prisma.caseta.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.producto.findMany({
      where: sp.caseta ? { casetaId: sp.caseta } : {},
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, casetaId: true },
    }),
    prisma.movimientoStock.findMany({
      where: {
        edicionId: edicion.id,
        ...(sp.caseta ? { casetaId: sp.caseta } : {}),
        ...(sp.producto ? { productoId: sp.producto } : {}),
        ...(tipo ? { tipo } : {}),
        ...(desde || hasta
          ? {
              fecha: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
      },
      include: {
        producto: { select: { nombre: true, unidad: true } },
        caseta: { select: { nombre: true } },
        usuario: { select: { name: true } },
      },
      orderBy: { fecha: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div>
      <SectionHeader
        title={`Movimientos — ${edicion.nombre}`}
        subtitle="Historial de stock (entradas por recepción + ajustes manuales). Solo lectura."
      />

      <form
        method="GET"
        className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4 sm:grid-cols-5"
        style={{ boxShadow: "var(--surface-glass-shadow)" }}
      >
        <div>
          <Label htmlFor="caseta">Caseta</Label>
          <select
            id="caseta"
            name="caseta"
            defaultValue={sp.caseta ?? ""}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Todas</option>
            {casetas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="producto">Producto</Label>
          <select
            id="producto"
            name="producto"
            defaultValue={sp.producto ?? ""}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Todos</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="tipo">Tipo</Label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={sp.tipo ?? ""}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Todos</option>
            <option value="entrada">Entrada</option>
            <option value="ajuste">Ajuste</option>
          </select>
        </div>
        <div>
          <Label htmlFor="desde">Desde</Label>
          <Input
            id="desde"
            name="desde"
            type="date"
            defaultValue={sp.desde ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="hasta">Hasta</Label>
          <Input
            id="hasta"
            name="hasta"
            type="date"
            defaultValue={sp.hasta ?? ""}
          />
        </div>
        <div className="col-span-full flex items-center gap-2">
          <Button type="submit" size="sm">
            Filtrar
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/inventario/movimientos">Limpiar</Link>
          </Button>
        </div>
      </form>

      {movimientos.length === 0 ? (
        <EmptyState
          title="Sin movimientos"
          description="No hay movimientos que coincidan con los filtros seleccionados."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Fecha</TableHead>
                <TableHead className="w-24">Tipo</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="w-40">Caseta</TableHead>
                <TableHead className="w-28 text-right">Cantidad</TableHead>
                <TableHead className="w-32">Usuario</TableHead>
                <TableHead>Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.map((m) => {
                const cantidad = Number(m.cantidad);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">
                      {FORMATO_FECHA.format(m.fecha)}
                    </TableCell>
                    <TableCell>
                      {m.tipo === "entrada" ? (
                        <Badge variant="active">Entrada</Badge>
                      ) : (
                        <Badge variant="muted">Ajuste</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {m.producto.nombre}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({m.producto.unidad})
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.caseta.nombre}
                    </TableCell>
                    <TableCell
                      className={
                        cantidad >= 0
                          ? "text-right font-mono text-primary"
                          : "text-right font-mono text-destructive-foreground"
                      }
                    >
                      {cantidad > 0 ? "+" : ""}
                      {cantidad}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.usuario?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.nota ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {movimientos.length === 200 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Mostrando los 200 movimientos más recientes. Afina los filtros si
              necesitas ver más antiguos.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
