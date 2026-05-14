import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../admin/_components/page-header";
import { EmpleadoForm } from "../_components/empleado-form";
import { TurnosAsignadosEmpleado } from "./_components/TurnosAsignadosEmpleado";

export default async function EditarEmpleadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "gerente"]);
  const { id } = await params;

  const empleado = await prisma.empleado.findUnique({
    where: { id },
    include: { tipos: { include: { tipoEmpleado: true } } },
  });
  if (!empleado) notFound();

  // Turnos del empleado a partir de hoy (00:00 UTC) y dentro de la edición activa.
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);

  // Carga entidades activas + la del empleado si está inactiva (no desaparece el valor guardado).
  const [entidadesConActual, tiposEmpleado, turnosAsignados] = await Promise.all([
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
        OR: [
          { activo: true },
          ...empleado.tipos.map((et) => ({ id: et.tipoEmpleadoId })),
        ],
      },
      orderBy: { orden: "asc" },
    }),
    prisma.turnoEmpleado.findMany({
      where: {
        empleadoId: id,
        turno: {
          fechaInicio: { gte: hoy },
          edicion: { activa: true },
        },
      },
      include: {
        turno: {
          include: { caseta: { select: { nombre: true } } },
        },
      },
      orderBy: { turno: { fechaInicio: "asc" } },
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
          email: empleado.email,
          telefono: empleado.telefono,
          jornalDiario: empleado.jornalDiario
            ? empleado.jornalDiario.toString()
            : null,
          entidadId: empleado.entidadId,
          tipoIds: empleado.tipos.map((et) => et.tipoEmpleadoId),
          esVoluntario: empleado.esVoluntario,
          activo: empleado.activo,
        }}
      />

      <TurnosAsignadosEmpleado
        empleadoId={empleado.id}
        turnos={turnosAsignados.map((a) => ({
          turnoId: a.turno.id,
          fechaInicio: a.turno.fechaInicio.toISOString(),
          fechaFin: a.turno.fechaFin.toISOString(),
          casetaNombre: a.turno.caseta.nombre,
        }))}
      />
    </FormShell>
  );
}
