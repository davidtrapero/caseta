import { notFound } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { FormShell } from "../../../admin/_components/page-header";
import { PedidoForm } from "../_components/pedido-form";
import {
  BotonRecibir,
  BotonCancelar,
} from "../_components/acciones-pedido";

const FORMATO_EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function badgeEstado(estado: "pendiente" | "recibido" | "cancelado") {
  if (estado === "pendiente") return <Badge variant="outline">Pendiente</Badge>;
  if (estado === "recibido") return <Badge variant="active">Recibido</Badge>;
  return <Badge variant="inactive">Cancelado</Badge>;
}

export default async function DetallePedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeGestionar = user.rol === "admin" || user.rol === "gerente";
  const { id } = await params;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      proveedor: true,
      caseta: true,
      detalles: {
        include: { producto: { select: { nombre: true, unidad: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!pedido) notFound();

  const editable = pedido.estado === "pendiente" && puedeGestionar;

  if (editable) {
    const [proveedores, casetas, productos] = await Promise.all([
      prisma.proveedor.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true },
      }),
      prisma.caseta.findMany({
        where: { activa: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true },
      }),
      prisma.producto.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
        select: {
          id: true,
          nombre: true,
          unidad: true,
          casetas: { select: { casetaId: true } },
        },
      }),
    ]);

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl">Pedido pendiente</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Creado {FORMATO_FECHA.format(pedido.fechaPedido)}.
              Puedes editar las líneas o cambiar el estado.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BotonRecibir id={pedido.id} />
            <BotonCancelar id={pedido.id} />
          </div>
        </div>

        <FormShell title="Editar pedido">
          <PedidoForm
            modo="editar"
            proveedores={proveedores}
            casetas={casetas}
            productos={productos}
            initial={{
              id: pedido.id,
              proveedorId: pedido.proveedorId,
              casetaId: pedido.casetaId,
              lineas: pedido.detalles.map((d) => ({
                productoId: d.productoId,
                cantidad: String(Number(d.cantidad)),
                precioUnitario: String(Number(d.precioUnitario)),
              })),
            }}
          />
        </FormShell>
      </div>
    );
  }

  // Solo lectura.
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl">Pedido #{pedido.id.slice(-6)}</h2>
            {badgeEstado(pedido.estado)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Creado {FORMATO_FECHA.format(pedido.fechaPedido)}
            {pedido.fechaRecepcion
              ? ` · Recibido ${FORMATO_FECHA.format(pedido.fechaRecepcion)}`
              : null}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/inventario/pedidos">Volver</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Proveedor
          </p>
          <p className="mt-1 font-medium">{pedido.proveedor.nombre}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Caseta destino
          </p>
          <p className="mt-1 font-medium">{pedido.caseta.nombre}</p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="w-24 text-right">Cantidad</TableHead>
            <TableHead className="w-20">Unidad</TableHead>
            <TableHead className="w-32 text-right">Precio ud.</TableHead>
            <TableHead className="w-32 text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedido.detalles.map((d) => {
            const cant = Number(d.cantidad);
            const prec = Number(d.precioUnitario);
            return (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  {d.producto.nombre}
                </TableCell>
                <TableCell className="text-right font-mono">{cant}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {d.producto.unidad}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {FORMATO_EUR.format(prec)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {FORMATO_EUR.format(cant * prec)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-end rounded-md border bg-muted/40 px-3 py-2">
        <span className="mr-3 text-sm text-muted-foreground">Total</span>
        <span className="font-mono text-lg font-medium">
          {FORMATO_EUR.format(Number(pedido.total))}
        </span>
      </div>
    </div>
  );
}
