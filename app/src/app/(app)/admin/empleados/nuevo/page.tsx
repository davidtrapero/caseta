import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { EmpleadoForm } from "../_components/empleado-form";

export default async function NuevoEmpleadoPage() {
  await requireRole(["admin", "gerente"]);
  return (
    <FormShell
      title="Nuevo empleado"
      subtitle="Dejar el jornal vacío si es voluntario."
    >
      <EmpleadoForm modo="crear" />
    </FormShell>
  );
}
