import { requireSessionOrRedirect } from "@/lib/authz";
import { InventarioTab } from "./_components/inventario-tab";

const TABS = [
  { href: "/inventario/productos", label: "Productos" },
  { href: "/inventario/stock", label: "Stock" },
  { href: "/inventario/pedidos", label: "Pedidos" },
  { href: "/inventario/movimientos", label: "Movimientos" },
];

export default async function InventarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionOrRedirect();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Inventario
        </p>
        <h1 className="text-3xl">Productos, stock y pedidos</h1>
      </header>

      <nav
        aria-label="Secciones de inventario"
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((tab) => (
          <InventarioTab key={tab.href} href={tab.href} label={tab.label} />
        ))}
      </nav>

      <section className="flex-1">{children}</section>
    </div>
  );
}
