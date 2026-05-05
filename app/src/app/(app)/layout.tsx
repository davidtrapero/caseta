import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LogOutButton } from "./_components/logout-button";
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

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: Rol[];
};

const NAV: NavItem[] = [
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

  const navItems = NAV.filter(
    ({ roles }) => !roles || roles.includes(user.rol)
  );

  return (
    <ToastProvider>
    <div className="flex min-h-screen bg-background">
      <aside className="w-60 border-r bg-card flex flex-col">
        <div className="px-6 py-5 border-b">
          <h1 className="text-lg font-semibold">Caseta</h1>
          <p className="text-xs text-muted-foreground">Gestión de feria</p>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3 flex flex-col gap-1">
          <div className="px-3 py-2 text-xs">
            <p className="font-medium truncate">{user.name}</p>
            <p className="text-muted-foreground truncate">{user.email}</p>
            <p className="text-muted-foreground mt-1 uppercase">{user.rol}</p>
          </div>
          <LogOutButton />
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
    </ToastProvider>
  );
}
