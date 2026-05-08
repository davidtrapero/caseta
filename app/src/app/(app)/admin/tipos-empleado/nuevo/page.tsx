import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { TipoEmpleadoForm } from "../_components/tipo-empleado-form";

export default async function NuevoTipoEmpleadoPage() {
  await requireRole(["admin"]);
  return (
    <FormShell
      title="Nuevo tipo de empleado"
      subtitle="Categoría con color propio para empleados y plazas de turno."
    >
      <TipoEmpleadoForm modo="crear" />
    </FormShell>
  );
}
