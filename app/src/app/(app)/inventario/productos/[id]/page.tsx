import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../../admin/_components/page-header";
import { ProductoForm } from "../_components/producto-form";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "gerente"]);
  const { id } = await params;

  const [producto, casetasActivas] = await Promise.all([
    prisma.producto.findUnique({
      where: { id },
      include: {
        casetas: {
          include: { caseta: { select: { id: true, nombre: true } } },
        },
      },
    }),
    prisma.caseta.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  if (!producto) notFound();

  const idsActivas = new Set(casetasActivas.map((c) => c.id));
  const inactivasVinculadas = producto.casetas
    .map((pc) => pc.caseta)
    .filter((c) => !idsActivas.has(c.id));
  const casetas = [...casetasActivas, ...inactivasVinculadas].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es")
  );

  return (
    <FormShell
      title={`Editar: ${producto.nombre}`}
      subtitle="Los cambios se registran en el log de auditoría."
    >
      <ProductoForm
        modo="editar"
        casetas={casetas}
        initial={{
          id: producto.id,
          casetaIds: producto.casetas.map((pc) => pc.casetaId),
          nombre: producto.nombre,
          unidad: producto.unidad,
          activo: producto.activo,
        }}
      />
    </FormShell>
  );
}
