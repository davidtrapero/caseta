import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { EdicionForm } from "../_components/edicion-form";

export default async function NuevaEdicionPage() {
  await requireRole(["admin"]);
  return (
    <FormShell
      title="Nueva edición"
      subtitle="Define el año, nombre y fechas de la feria."
    >
      <EdicionForm modo="crear" />
    </FormShell>
  );
}
