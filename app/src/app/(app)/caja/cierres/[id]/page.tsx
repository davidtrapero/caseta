import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { FormShell } from "../../../admin/_components/page-header";
import { CierreForm } from "../_components/cierre-form";

function dateToYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function EditarCierrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const { id } = await params;

  const cierre = await prisma.cierreDiario.findUnique({
    where: { id },
    include: { caseta: { select: { nombre: true } } },
  });
  if (!cierre) notFound();

  const casetas = await prisma.caseta.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  // Lectura si: bloqueado y no-admin, o rol cajero sobre bloqueado.
  const soloLectura = cierre.bloqueado && user.rol !== "admin";

  return (
    <FormShell
      title={`Cierre ${dateToYmd(cierre.fecha)} — ${cierre.caseta.nombre}`}
      subtitle="Los cambios quedan registrados en el log de auditoría."
    >
      <CierreForm
        modo="editar"
        casetas={casetas}
        soloLectura={soloLectura}
        initial={{
          id: cierre.id,
          casetaId: cierre.casetaId,
          fecha: dateToYmd(cierre.fecha),
          ingresosTotales: cierre.ingresosTotales.toString(),
          notas: cierre.notas,
          bloqueado: cierre.bloqueado,
        }}
      />
    </FormShell>
  );
}
