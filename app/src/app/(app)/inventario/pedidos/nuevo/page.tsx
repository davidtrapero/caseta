import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import {
  FormShell,
  EmptyState,
} from "../../../admin/_components/page-header";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { PedidoForm } from "../_components/pedido-form";

export default async function NuevoPedidoPage() {
  await requireRole(["admin", "gerente"]);

  const edicion = await obtenerEdicionActiva();
  if (!edicion) {
    return (
      <EmptyState
        title="No hay edición activa"
        description="Activa una edición antes de crear pedidos."
        actionHref="/admin/ediciones"
        actionLabel="Ir a ediciones"
      />
    );
  }

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

  if (proveedores.length === 0 || casetas.length === 0) {
    return (
      <EmptyState
        title="Faltan datos maestros"
        description="Necesitas al menos un proveedor activo y una caseta activa para crear pedidos."
        actionHref="/admin/proveedores"
        actionLabel="Ir a proveedores"
      />
    );
  }

  return (
    <FormShell
      title="Nuevo pedido"
      subtitle={`Edición: ${edicion.nombre}. El stock se actualizará al marcar el pedido como recibido.`}
    >
      <PedidoForm
        modo="crear"
        proveedores={proveedores}
        casetas={casetas}
        productos={productos}
      />
    </FormShell>
  );
}
