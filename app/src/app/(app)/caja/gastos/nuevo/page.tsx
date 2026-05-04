import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import {
  FormShell,
  EmptyState,
} from "../../../admin/_components/page-header";
import { GastoForm } from "../_components/gasto-form";
import { obtenerEdicionActiva } from "../../_lib/edicion-activa";

export default async function NuevoGastoPage() {
  await requireRole(["admin", "gerente", "cajero"]);

  const edicion = await obtenerEdicionActiva();
  if (!edicion) {
    return (
      <EmptyState
        title="No hay edición activa"
        description="Activa una edición antes de registrar gastos."
        actionHref="/admin/ediciones"
        actionLabel="Ir a ediciones"
      />
    );
  }

  const casetas = await prisma.caseta.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  return (
    <FormShell
      title="Nuevo gasto"
      subtitle={`Edición: ${edicion.nombre}. Deja la caseta vacía para un gasto centralizado.`}
    >
      <GastoForm modo="crear" casetas={casetas} />
    </FormShell>
  );
}
