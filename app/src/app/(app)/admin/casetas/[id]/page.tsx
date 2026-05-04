import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { CasetaForm } from "../_components/caseta-form";

export default async function EditarCasetaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "gerente"]);
  const { id } = await params;

  const caseta = await prisma.caseta.findUnique({ where: { id } });
  if (!caseta) notFound();

  return (
    <FormShell
      title={`Editar: ${caseta.nombre}`}
      subtitle="Los cambios se registran en el log de auditoría."
    >
      <CasetaForm
        modo="editar"
        initial={{
          id: caseta.id,
          nombre: caseta.nombre,
          ubicacion: caseta.ubicacion,
          activa: caseta.activa,
        }}
      />
    </FormShell>
  );
}
