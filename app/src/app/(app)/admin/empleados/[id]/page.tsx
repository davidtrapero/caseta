import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { EmpleadoForm } from "../_components/empleado-form";

export default async function EditarEmpleadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "gerente"]);
  const { id } = await params;

  const empleado = await prisma.empleado.findUnique({ where: { id } });
  if (!empleado) notFound();

  // Carga entidades activas + la del empleado si está inactiva (no desaparece el valor guardado).
  const entidadesConActual = await prisma.entidadVoluntario.findMany({
    where: {
      OR: [
        { activa: true },
        ...(empleado.entidadId ? [{ id: empleado.entidadId }] : []),
      ],
    },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  return (
    <FormShell
      title={`Editar: ${empleado.nombre}`}
      subtitle="Los cambios se registran en el log de auditoría."
    >
      <EmpleadoForm
        modo="editar"
        entidades={entidadesConActual}
        initial={{
          id: empleado.id,
          nombre: empleado.nombre,
          dni: empleado.dni,
          telefono: empleado.telefono,
          jornalDiario: empleado.jornalDiario
            ? empleado.jornalDiario.toString()
            : null,
          entidadId: empleado.entidadId,
          perfil: empleado.perfil,
          activo: empleado.activo,
        }}
      />
    </FormShell>
  );
}
