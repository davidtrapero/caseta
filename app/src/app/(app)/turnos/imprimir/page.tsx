import { requireRole } from "@/lib/authz";
import { loadSemanaTurnos } from "../_lib/loader";
import { VistaImprimir } from "./_components/VistaImprimir";
import { EmptyState } from "../../admin/_components/page-header";

export default async function ImprimirTurnosPage({
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
        title="Sin datos para imprimir"
        description="No se encontró una edición o caseta válida."
      />
    );
  }

  return <VistaImprimir semana={semana} />;
}
