import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { TipoEmpleadoForm } from "../_components/tipo-empleado-form";

export default async function EditarTipoEmpleadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;

  const tipo = await prisma.tipoEmpleado.findUnique({
    where: { id },
    include: {
      _count: { select: { empleadoTipos: true, plazas: true } },
    },
  });
  if (!tipo) notFound();

  return (
    <FormShell
      title={`Editar: ${tipo.label}`}
      subtitle="Los cambios afectan a empleados y plazas que usen este tipo."
    >
      <TipoEmpleadoForm
        modo="editar"
        initial={{
          id: tipo.id,
          slug: tipo.slug,
          label: tipo.label,
          labelCorto: tipo.labelCorto,
          colorHex: tipo.colorHex,
          orden: tipo.orden,
          esVoluntario: tipo.esVoluntario,
          activo: tipo.activo,
          empleadosCount: tipo._count.empleadoTipos,
          plazasCount: tipo._count.plazas,
        }}
      />
    </FormShell>
  );
}
