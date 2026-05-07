import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { EmpleadoForm } from "../_components/empleado-form";

export default async function NuevoEmpleadoPage() {
  await requireRole(["admin", "gerente"]);

  const [entidades, casetasDefaults] = await Promise.all([
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
          { perfilDefecto: { not: null } },
        ],
      },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        jornalDiarioDefault: true,
        perfilDefecto: true,
      },
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
        casetasDefaults={casetasDefaults.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          jornalDiarioDefault: c.jornalDiarioDefault?.toString() ?? null,
          perfilDefecto: c.perfilDefecto ?? null,
        }))}
      />
    </FormShell>
  );
}
