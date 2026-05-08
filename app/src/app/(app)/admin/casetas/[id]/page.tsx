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

  const tiposEmpleado = await prisma.tipoEmpleado.findMany({
    where: {
      OR: [
        { activo: true },
        ...(caseta.tipoEmpleadoDefectoId
          ? [{ id: caseta.tipoEmpleadoDefectoId }]
          : []),
      ],
    },
    orderBy: { orden: "asc" },
  });

  return (
    <FormShell
      title={`Editar: ${caseta.nombre}`}
      subtitle="Los cambios se registran en el log de auditoría."
    >
      <CasetaForm
        modo="editar"
        tiposEmpleado={tiposEmpleado.map((t) => ({
          id: t.id,
          slug: t.slug,
          label: t.label,
          labelCorto: t.labelCorto,
          colorHex: t.colorHex,
          esVoluntario: t.esVoluntario,
          orden: t.orden,
        }))}
        initial={{
          id: caseta.id,
          nombre: caseta.nombre,
          ubicacion: caseta.ubicacion,
          activa: caseta.activa,
          jornalDiarioDefault: caseta.jornalDiarioDefault?.toString() ?? null,
          tipoEmpleadoDefectoId: caseta.tipoEmpleadoDefectoId ?? null,
        }}
      />
    </FormShell>
  );
}
