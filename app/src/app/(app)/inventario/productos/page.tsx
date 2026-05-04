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

export default async function ProductosPage({
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

  const productos = await prisma.producto.findMany({
    where: filtroCaseta ? { casetaId: filtroCaseta } : {},
    include: { caseta: { select: { nombre: true } } },
    orderBy: [
      { activo: "desc" },
      { caseta: { nombre: "asc" } },
      { nombre: "asc" },
    ],
  });

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-40">Caseta</TableHead>
              <TableHead className="w-32">Unidad</TableHead>
              <TableHead className="w-32">Estado</TableHead>
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
      )}
    </div>
  );
}
