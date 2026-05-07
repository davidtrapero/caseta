import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LogOutButton } from "./_components/logout-button";
import { SidebarNav, type NavItem } from "./_components/sidebar-nav";
import { ToastProvider } from "@/components/ui/toaster";
import {
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Home,
  Package,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import type { Rol } from "@prisma/client";

const NAV: (NavItem & { roles?: Rol[] })[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/turnos", label: "Turnos", icon: Calendar },
  { href: "/turnos/asistencias", label: "Asistencias", icon: ClipboardCheck, roles: ["admin", "gerente"] },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: ClipboardList, roles: ["admin", "gerente"] },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/caja", label: "Caja", icon: Receipt },
  { href: "/admin/entidades", label: "Entidades", icon: Users, roles: ["admin", "gerente"] },
  { href: "/admin", label: "Administración", icon: Settings },
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
    .map(({ href, label, icon }) => ({ href, label, icon }));

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
        <main className="flex-1 p-6 md:p-8 overflow-auto pt-16 md:pt-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
