import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogOutButton } from "./_components/logout-button";
import { SidebarNav, type NavItem } from "./_components/sidebar-nav";
import { EnforcePasswordChange } from "./_components/EnforcePasswordChange";
import { ToastProvider } from "@/components/ui/toaster";
import { EdicionBanner } from "@/components/edicion-banner";
import type { Rol } from "@prisma/client";
import { getTheme } from "@/lib/theme";

const NAV: (NavItem & { roles?: Rol[] })[] = [
  { href: "/", label: "Inicio" },
  { href: "/turnos", label: "Turnos" },
  { href: "/turnos/asistencias", label: "Asistencias", roles: ["admin", "gerente"] },
  { href: "/admin/solicitudes", label: "Solicitudes", roles: ["admin", "gerente"] },
  { href: "/empleados", label: "Empleados", roles: ["admin", "gerente"] },
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
  const theme = await getTheme();

  // La sesión de Better Auth no incluye debeCambiarPassword (no está marcada
  // como additionalField en auth.ts). Lo consultamos directamente para que el
  // EnforcePasswordChange pueda forzar el redirect tras alta/reset admin.
  const flagRow = await prisma.user.findUnique({
    where: { id: user.id },
    select: { debeCambiarPassword: true },
  });
  const debeCambiar = flagRow?.debeCambiarPassword ?? false;

  const navItems: NavItem[] = NAV
    .filter(({ roles }) => !roles || roles.includes(user.rol))
    .map(({ href, label }) => ({ href, label }));

  return (
    <ToastProvider>
      <EnforcePasswordChange debeCambiar={debeCambiar} />
      <div className="flex min-h-screen">
        <SidebarNav
          items={navItems}
          userName={user.name}
          userEmail={user.email}
          userRol={user.rol}
          logoutButton={<LogOutButton />}
          theme={theme}
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
