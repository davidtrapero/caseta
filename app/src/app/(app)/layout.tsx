import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LogOutButton } from "./_components/logout-button";
import { SidebarNav, type NavItem } from "./_components/sidebar-nav";
import { ToastProvider } from "@/components/ui/toaster";
import { EdicionBanner } from "@/components/edicion-banner";
import type { Rol } from "@prisma/client";

const NAV: (NavItem & { roles?: Rol[] })[] = [
  { href: "/", label: "Inicio" },
  { href: "/turnos", label: "Turnos" },
  { href: "/turnos/asistencias", label: "Asistencias", roles: ["admin", "gerente"] },
  { href: "/admin/solicitudes", label: "Solicitudes", roles: ["admin", "gerente"] },
  { href: "/inventario", label: "Inventario" },
  { href: "/caja", label: "Caja" },
  { href: "/admin", label: "Administración" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const user = session.user as typeof session.user & { rol: Rol };

  const navItems: NavItem[] = NAV
    .filter(({ roles }) => !roles || roles.includes(user.rol))
    .map(({ href, label }) => ({ href, label }));

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-background">
        <SidebarNav
          items={navItems}
          userName={user.name}
          userEmail={user.email}
          userRol={user.rol}
          logoutButton={<LogOutButton />}
        />
        <div className="flex-1 flex flex-col overflow-auto">
          <div className="pt-16 md:pt-0">
            <EdicionBanner />
          </div>
          <main className="flex-1 p-6 md:p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
