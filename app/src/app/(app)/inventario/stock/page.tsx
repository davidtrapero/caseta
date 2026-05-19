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
import {
  SectionHeader,
  EmptyState,
} from "../../admin/_components/page-header";
import { FiltroCaseta } from "../_lib/caseta-filtro";
import { AjustarStockModal } from "./_components/ajustar-stock-modal";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ caseta?: string }>;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeEditar = user.rol === "admin" || user.rol === "gerente";
  const { caseta: filtroCaseta } = await searchParams;

  const casetas = await prisma.caseta.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  const vinculos = await prisma.productoCaseta.findMany({
    where: {
      producto: { activo: true },
      ...(filtroCaseta ? { casetaId: filtroCaseta } : {}),
    },
    include: {
      caseta: { select: { nombre: true } },
      producto: { select: { id: true, nombre: true, unidad: true } },
    },
    orderBy: [
      { caseta: { nombre: "asc" } },
      { producto: { nombre: "asc" } },
    ],
  });

  const stocks = await prisma.stock.findMany({
    where: {
      productoId: { in: vinculos.map((v) => v.productoId) },
      ...(filtroCaseta ? { casetaId: filtroCaseta } : {}),
    },
    select: { casetaId: true, productoId: true, cantidad: true, updatedAt: true },
  });
  const stockPorPar = new Map(
    stocks.map((s) => [`${s.casetaId}:${s.productoId}`, s])
  );

  const filas = vinculos.map((v) => ({
    id: v.id,
    casetaId: v.casetaId,
    casetaNombre: v.caseta.nombre,
    producto: v.producto,
    stock: stockPorPar.get(`${v.casetaId}:${v.productoId}`) ?? null,
  }));

  const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <SectionHeader
        title="Stock"
        subtitle="Cantidad disponible por producto y caseta. Pulsa 'Ajustar' para corregir tras un inventario físico."
      />

      <FiltroCaseta
        base="/inventario/stock"
        casetas={casetas}
        activo={filtroCaseta}
      />

      {filas.length === 0 ? (
        <EmptyState
          title="Sin productos activos"
          description={
            filtroCaseta
              ? "Esta caseta no tiene productos activos."
              : "Crea productos en el catálogo para empezar a controlar el stock."
          }
          actionHref="/inventario/productos"
          actionLabel="Ir a productos"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="w-40">Caseta</TableHead>
              <TableHead className="w-24 text-right">Cantidad</TableHead>
              <TableHead className="w-20">Unidad</TableHead>
              <TableHead className="w-40">Actualizado</TableHead>
              <TableHead className="w-28 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila) => {
              const cantidad = fila.stock ? Number(fila.stock.cantidad) : 0;
              const actualizado = fila.stock?.updatedAt
                ? FORMATO_FECHA.format(fila.stock.updatedAt)
                : "—";
              return (
                <TableRow key={fila.id}>
                  <TableCell className="font-medium">{fila.producto.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {fila.casetaNombre}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {cantidad}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fila.producto.unidad}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {actualizado}
                  </TableCell>
                  <TableCell className="text-right">
                    {puedeEditar ? (
                      <AjustarStockModal
                        casetaId={fila.casetaId}
                        productoId={fila.producto.id}
                        productoNombre={fila.producto.nombre}
                        unidad={fila.producto.unidad}
                        cantidadActual={cantidad}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Solo lectura
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
