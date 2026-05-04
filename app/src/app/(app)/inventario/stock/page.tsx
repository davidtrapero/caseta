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

  // Base: todos los productos activos (opcionalmente filtrados por caseta).
  // El LEFT JOIN con Stock lo hacemos en JS porque stock puede no existir.
  const productos = await prisma.producto.findMany({
    where: {
      activo: true,
      ...(filtroCaseta ? { casetaId: filtroCaseta } : {}),
    },
    include: {
      caseta: { select: { nombre: true } },
      stock: { select: { id: true, cantidad: true, updatedAt: true } },
    },
    orderBy: [
      { caseta: { nombre: "asc" } },
      { nombre: "asc" },
    ],
  });

  const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <SectionHeader
        title="Stock"
        subtitle="Cantidad disponible por producto. Pulsa 'Ajustar' para corregir tras un inventario físico."
      />

      <FiltroCaseta
        base="/inventario/stock"
        casetas={casetas}
        activo={filtroCaseta}
      />

      {productos.length === 0 ? (
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
            {productos.map((p) => {
              const stockFila = p.stock[0];
              const cantidad = stockFila ? Number(stockFila.cantidad) : 0;
              const actualizado = stockFila?.updatedAt
                ? FORMATO_FECHA.format(stockFila.updatedAt)
                : "—";
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.caseta.nombre}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {cantidad}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.unidad}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {actualizado}
                  </TableCell>
                  <TableCell className="text-right">
                    {puedeEditar ? (
                      <AjustarStockModal
                        casetaId={p.casetaId}
                        productoId={p.id}
                        productoNombre={p.nombre}
                        unidad={p.unidad}
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
