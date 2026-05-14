import { requireRole } from "@/lib/authz";
import { SectionHeader } from "../../admin/_components/page-header";
import { FormCambiarPassword } from "./_components/FormCambiarPassword";

export default async function CambiarPasswordPage() {
  await requireRole(["admin", "gerente", "cajero"]);
  return (
    <div className="max-w-md">
      <SectionHeader
        title="Cambiar contraseña"
        subtitle="Introduce tu contraseña actual y la nueva."
      />
      <FormCambiarPassword />
    </div>
  );
}
