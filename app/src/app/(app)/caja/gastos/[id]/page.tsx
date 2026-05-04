import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../../admin/_components/page-header";
import { GastoForm } from "../_components/gasto-form";

function dateToYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function EditarGastoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "gerente", "cajero"]);
  const { id } = await params;

  const gasto = await prisma.gasto.findUnique({ where: { id } });
  if (!gasto) notFound();

  const casetas = await prisma.caseta.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  return (
    <FormShell
      title={`Editar gasto`}
      subtitle="Los cambios quedan registrados en el log de auditoría."
    >
      <GastoForm
        modo="editar"
        casetas={casetas}
        initial={{
          id: gasto.id,
          descripcion: gasto.descripcion,
          monto: gasto.monto.toString(),
          categoria: gasto.categoria,
          fecha: dateToYmd(gasto.fecha),
          casetaId: gasto.casetaId,
        }}
      />
    </FormShell>
  );
}
