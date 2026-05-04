import { requireRole } from "@/lib/authz";
import { loadSemanaTurnos } from "./_lib/loader";
import { VistaTurnos } from "./_components/VistaTurnos";
import { EmptyState } from "../admin/_components/page-header";

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ casetaId?: string; semana?: string }>;
}) {
  await requireRole(["admin", "gerente", "cajero"]);
  const sp = await searchParams;

  const semana = await loadSemanaTurnos({
    casetaId: sp.casetaId,
    semana: sp.semana,
  });

  if (!semana) {
    return (
      <EmptyState
        title="No hay datos para Turnos"
        description="Crea primero una edición y al menos una caseta desde Administración."
        actionHref="/admin"
        actionLabel="Ir a Administración"
      />
    );
  }

  return <VistaTurnos semana={semana} />;
}
