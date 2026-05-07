import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { CasetaForm } from "../_components/caseta-form";

export default async function NuevaCasetaPage() {
  await requireRole(["admin", "gerente"]);
  return (
    <FormShell
      title="Nueva caseta"
      subtitle="Un punto de venta físico de San Isidro."
    >
      <CasetaForm modo="crear" />
    </FormShell>
  );
}
