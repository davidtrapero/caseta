import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import {
  FormShell,
  EmptyState,
} from "../../../admin/_components/page-header";
import { ProductoForm } from "../_components/producto-form";

export default async function NuevoProductoPage({
  searchParams,
}: {
  searchParams: Promise<{ caseta?: string }>;
}) {
  await requireRole(["admin", "gerente"]);
  const { caseta: casetaPorDefecto } = await searchParams;

  const casetas = await prisma.caseta.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  if (casetas.length === 0) {
    return (
      <EmptyState
        title="No hay casetas activas"
        description="Crea al menos una caseta antes de registrar productos."
        actionHref="/admin/casetas"
        actionLabel="Ir a casetas"
      />
    );
  }

  return (
    <FormShell
      title="Nuevo producto"
      subtitle="El catálogo es por caseta: dos casetas pueden tener el mismo producto con stocks independientes."
    >
      <ProductoForm
        modo="crear"
        casetas={casetas}
        casetaPorDefecto={casetaPorDefecto}
      />
    </FormShell>
  );
}
