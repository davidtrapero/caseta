import { requireSessionOrRedirect } from "@/lib/authz";
import { AdminTab } from "./_components/admin-tab";

const TABS = [
  { href: "/admin/ediciones", label: "Ediciones" },
  { href: "/admin/casetas", label: "Casetas" },
  { href: "/admin/tipos-empleado", label: "Tipos de empleado" },
  { href: "/admin/proveedores", label: "Proveedores" },
  { href: "/admin/entidades", label: "Entidades" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/mantenimiento", label: "Mantenimiento" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionOrRedirect();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">
          Administración
        </p>
        <h1 className="text-3xl">Administración</h1>
      </header>

      <nav
        aria-label="Secciones de administración"
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((tab) => (
          <AdminTab key={tab.href} href={tab.href} label={tab.label} />
        ))}
      </nav>

      <section className="flex-1">{children}</section>
    </div>
  );
}
