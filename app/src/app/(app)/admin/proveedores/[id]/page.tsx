import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { ProveedorForm } from "../_components/proveedor-form";

export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "gerente"]);
  const { id } = await params;

  const proveedor = await prisma.proveedor.findUnique({ where: { id } });
  if (!proveedor) notFound();

  return (
    <FormShell
      title={`Editar: ${proveedor.nombre}`}
      subtitle="Los cambios se registran en el log de auditoría."
    >
      <ProveedorForm
        modo="editar"
        initial={{
          id: proveedor.id,
          nombre: proveedor.nombre,
          contacto: proveedor.contacto,
          email: proveedor.email,
          telefono: proveedor.telefono,
          activo: proveedor.activo,
        }}
      />
    </FormShell>
  );
}
