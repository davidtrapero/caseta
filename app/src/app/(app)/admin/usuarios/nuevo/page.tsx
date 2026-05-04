import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { UsuarioForm } from "../_components/usuario-form";

export default async function NuevoUsuarioPage() {
  await requireRole(["admin"]);
  return (
    <FormShell
      title="Nuevo usuario"
      subtitle="Email y contraseña iniciales. El rol se asigna en este paso."
    >
      <UsuarioForm modo="crear" />
    </FormShell>
  );
}
