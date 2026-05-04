import { requireSessionOrRedirect } from "@/lib/authz";
import { CajaTab } from "./_components/caja-tab";

const TABS = [
  { href: "/caja/cierres", label: "Cierres" },
  { href: "/caja/gastos", label: "Gastos" },
  { href: "/caja/nominas", label: "Nóminas" },
  { href: "/caja/balance", label: "Balance" },
];

export default async function CajaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionOrRedirect();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Caja y contabilidad
        </p>
        <h1 className="text-3xl">Ingresos, gastos y nóminas</h1>
      </header>

      <nav
        aria-label="Secciones de caja"
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((tab) => (
          <CajaTab key={tab.href} href={tab.href} label={tab.label} />
        ))}
      </nav>

      <section className="flex-1">{children}</section>
    </div>
  );
}
