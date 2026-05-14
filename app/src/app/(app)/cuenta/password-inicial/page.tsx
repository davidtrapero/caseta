import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { SectionHeader } from "../../admin/_components/page-header";
import { FormPasswordInicial } from "./_components/FormPasswordInicial";

export default async function PasswordInicialPage() {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { debeCambiarPassword: true },
  });
  if (!fresh?.debeCambiarPassword) redirect("/");
  return (
    <div className="max-w-md">
      <SectionHeader
        title="Establece tu contraseña"
        subtitle="Por seguridad, debes cambiar la contraseña inicial antes de continuar."
      />
      <FormPasswordInicial />
    </div>
  );
}
