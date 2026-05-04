import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../../admin/_components/page-header";
import { EmptyState } from "../../../admin/_components/page-header";
import { CierreForm } from "../_components/cierre-form";
import { obtenerEdicionActiva } from "../../_lib/edicion-activa";

export default async function NuevoCierrePage() {
  await requireRole(["admin", "gerente", "cajero"]);

  const edicion = await obtenerEdicionActiva();
  if (!edicion) {
    return (
      <EmptyState
        title="No hay edición activa"
        description="Activa una edición antes de registrar cierres."
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
      title="Nuevo cierre diario"
      subtitle={`Edición: ${edicion.nombre}. Un cierre por caseta y día.`}
    >
      <CierreForm modo="crear" casetas={casetas} />
    </FormShell>
  );
}
