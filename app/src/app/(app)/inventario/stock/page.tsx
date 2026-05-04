import { SectionHeader, EmptyState } from "../../admin/_components/page-header";

export default function StockPage() {
  return (
    <div>
      <SectionHeader
        title="Stock"
        subtitle="Cantidad actual por caseta y producto."
      />
      <EmptyState
        title="Próximamente"
        description="La vista de stock se activa en la Fase 5B."
      />
    </div>
  );
}
