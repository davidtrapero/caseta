import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { EdicionForm } from "../_components/edicion-form";

export default async function EditarEdicionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;

  const edicion = await prisma.edicion.findUnique({ where: { id } });
  if (!edicion) notFound();

  return (
    <FormShell
      title={`Editar: ${edicion.nombre}`}
      subtitle="Los cambios se registran en el log de auditoría."
    >
      <EdicionForm
        modo="editar"
        initial={{
          id: edicion.id,
          anio: edicion.anio,
          nombre: edicion.nombre,
          fechaInicio: edicion.fechaInicio.toISOString(),
          fechaFin: edicion.fechaFin.toISOString(),
          activa: edicion.activa,
        }}
      />
    </FormShell>
  );
}
