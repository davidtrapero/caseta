import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../_components/page-header";
import { UsuarioForm } from "../_components/usuario-form";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user: actual } = await requireRole(["admin"]);
  const { id } = await params;

  const usuario = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      rol: true,
      activo: true,
    },
  });
  if (!usuario) notFound();

  return (
    <FormShell
      title={`Editar: ${usuario.name}`}
      subtitle="Cambios en el rol y estado. El email y la contraseña se gestionan fuera de este formulario."
    >
      <UsuarioForm
        modo="editar"
        initial={{
          id: usuario.id,
          email: usuario.email,
          name: usuario.name,
          rol: usuario.rol,
          activo: usuario.activo,
        }}
        esAutoedicion={usuario.id === actual.id}
      />
    </FormShell>
  );
}
