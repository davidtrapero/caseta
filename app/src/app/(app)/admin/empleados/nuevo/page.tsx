import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { EmpleadoForm } from "../_components/empleado-form";

export default async function NuevoEmpleadoPage() {
  await requireRole(["admin", "gerente"]);

  const entidades = await prisma.entidadVoluntario.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  return (
    <FormShell
      title="Nuevo empleado"
      subtitle="Dejar el jornal vacío si es voluntario."
    >
      <EmpleadoForm modo="crear" entidades={entidades} />
    </FormShell>
  );
}
