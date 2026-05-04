import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { ProveedorForm } from "../_components/proveedor-form";

export default async function NuevoProveedorPage() {
  await requireRole(["admin", "gerente"]);
  return (
    <FormShell
      title="Nuevo proveedor"
      subtitle="Datos mínimos para contactar y hacer pedidos."
    >
      <ProveedorForm modo="crear" />
    </FormShell>
  );
}
