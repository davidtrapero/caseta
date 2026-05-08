import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../admin/_components/page-header";
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
  const [entidadesConActual, tiposEmpleado] = await Promise.all([
    prisma.entidadVoluntario.findMany({
      where: {
        OR: [
          { activa: true },
          ...(empleado.entidadId ? [{ id: empleado.entidadId }] : []),
        ],
      },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.tipoEmpleado.findMany({
      where: {
        OR: [{ activo: true }, { id: empleado.tipoEmpleadoId }],
      },
      orderBy: { orden: "asc" },
    }),
  ]);

  return (
    <FormShell
      title={`Editar: ${empleado.nombre}`}
      subtitle="Los cambios se registran en el log de auditoría."
    >
      <EmpleadoForm
        modo="editar"
        entidades={entidadesConActual}
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
          id: empleado.id,
          nombre: empleado.nombre,
          dni: empleado.dni,
          telefono: empleado.telefono,
          jornalDiario: empleado.jornalDiario
            ? empleado.jornalDiario.toString()
            : null,
          entidadId: empleado.entidadId,
          tipoEmpleadoId: empleado.tipoEmpleadoId,
          activo: empleado.activo,
        }}
      />
    </FormShell>
  );
}
