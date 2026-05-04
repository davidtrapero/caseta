import { SectionHeader, EmptyState } from "../../admin/_components/page-header";

export default function PedidosPage() {
  return (
    <div>
      <SectionHeader
        title="Pedidos"
        subtitle="Pedidos a proveedores y recepción de stock."
      />
      <EmptyState
        title="Próximamente"
        description="La gestión de pedidos se activa en la Fase 5C."
      />
    </div>
  );
}
