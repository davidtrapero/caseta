"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Home,
  Package,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";

export type NavItem = {
  href: string;
  label: string;
};

const ICON_MAP: Record<string, React.ElementType> = {
  "/": Home,
  "/turnos": Calendar,
  "/turnos/asistencias": ClipboardCheck,
  "/admin/solicitudes": ClipboardList,
  "/empleados": Users,
  "/inventario": Package,
  "/caja": Receipt,
  "/admin": Settings,
};

interface SidebarNavProps {
  items: NavItem[];
  userName: string;
  userEmail: string;
  userRol: string;
  logoutButton: React.ReactNode;
}

function NavLinks({ items, onNavClick }: { items: NavItem[]; onNavClick?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {items.map(({ href, label }) => {
        const Icon = ICON_MAP[href];
        const isActive =
          href === "/"
            ? pathname === "/"
            : pathname === href ||
              (pathname.startsWith(href + "/") &&
                !items.some(
                  (other) =>
                    other.href !== href &&
                    other.href.startsWith(href + "/") &&
                    (pathname === other.href || pathname.startsWith(other.href + "/"))
                ));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-l-2 border-primary bg-primary/10 pl-[10px] font-medium text-primary"
                : "hover:bg-accent/20 hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function SidebarNav({ items, userName, userEmail, userRol, logoutButton }: SidebarNavProps) {
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="px-6 py-5 border-b">
        <h1 className="text-lg font-semibold">Caseta</h1>
        <p className="text-xs text-muted-foreground">San Isidro de Madrid</p>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-1">
        <NavLinks items={items} onNavClick={() => setOpen(false)} />
      </nav>
      <div className="border-t p-3 flex flex-col gap-1">
        <div className="px-3 py-2 text-xs">
          <p className="font-medium truncate">{userName}</p>
          <p className="text-muted-foreground truncate">{userEmail}</p>
          <p className="text-muted-foreground mt-1 uppercase">{userRol}</p>
        </div>
        {logoutButton}
      </div>
    </>
  );

  return (
    <>
      {/* Botón hamburguesa — solo en móvil */}
      <button
        className="md:hidden fixed top-4 left-4 z-30 rounded-md border bg-card p-2 shadow-sm"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar fijo en desktop */}
      <aside className="hidden md:flex w-60 border-r bg-card flex-col">
        {sidebarContent}
      </aside>

      {/* Drawer en móvil */}
      <Sheet open={open} onClose={() => setOpen(false)}>
        <button
          className="absolute top-4 right-4 rounded-md p-1 hover:bg-accent/20"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </Sheet>
    </>
  );
}
