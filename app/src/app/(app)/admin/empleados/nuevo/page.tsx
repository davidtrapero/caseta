import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { EmpleadoForm } from "../_components/empleado-form";

export default async function NuevoEmpleadoPage() {
  await requireRole(["admin", "gerente"]);

  const [entidades, casetasDefaults, tiposEmpleado] = await Promise.all([
    prisma.entidadVoluntario.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.caseta.findMany({
      where: {
        activa: true,
        OR: [
          { jornalDiarioDefault: { not: null } },
          { tipoEmpleadoDefectoId: { not: null } },
        ],
      },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        jornalDiarioDefault: true,
        tipoEmpleadoDefectoId: true,
      },
    }),
    prisma.tipoEmpleado.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
    }),
  ]);

  return (
    <FormShell
      title="Nuevo empleado"
      subtitle="Dejar el jornal vacío si es voluntario."
    >
      <EmpleadoForm
        modo="crear"
        entidades={entidades}
        tiposEmpleado={tiposEmpleado.map((t) => ({
          id: t.id,
          slug: t.slug,
          label: t.label,
          labelCorto: t.labelCorto,
          colorHex: t.colorHex,
          esVoluntario: t.esVoluntario,
          orden: t.orden,
        }))}
        casetasDefaults={casetasDefaults.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          jornalDiarioDefault: c.jornalDiarioDefault?.toString() ?? null,
          tipoEmpleadoDefectoId: c.tipoEmpleadoDefectoId ?? null,
        }))}
      />
    </FormShell>
  );
}
