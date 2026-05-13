import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { CasetaForm } from "../_components/caseta-form";

export default async function NuevaCasetaPage() {
  await requireRole(["admin", "gerente"]);

  const tiposEmpleado = await prisma.tipoEmpleado.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
  });

  return (
    <FormShell
      title="Nueva caseta"
      subtitle="Un punto de venta físico de San Isidro."
    >
      <CasetaForm
        modo="crear"
        tiposEmpleado={tiposEmpleado.map((t) => ({
          id: t.id,
          slug: t.slug,
          label: t.label,
          labelCorto: t.labelCorto,
          colorHex: t.colorHex,
          esVoluntario: t.esVoluntario,
          orden: t.orden,
        }))}
      />
    </FormShell>
  );
}
