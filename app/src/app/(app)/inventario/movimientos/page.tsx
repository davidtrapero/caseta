import { SectionHeader, EmptyState } from "../../admin/_components/page-header";

export default function MovimientosPage() {
  return (
    <div>
      <SectionHeader
        title="Movimientos"
        subtitle="Historial completo de entradas y ajustes de stock."
      />
      <EmptyState
        title="Próximamente"
        description="El historial de movimientos se activa en la Fase 5D."
      />
    </div>
  );
}
