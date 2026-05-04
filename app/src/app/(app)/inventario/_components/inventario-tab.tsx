"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function InventarioTab({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const caseta = searchParams.get("caseta");
  const finalHref = caseta ? `${href}?caseta=${caseta}` : href;
  return (
    <Link
      href={finalHref}
      className={cn(
        "relative px-4 py-2 text-sm transition-colors",
        "after:absolute after:inset-x-2 after:bottom-[-1px] after:h-[2px] after:transition-all",
        active
          ? "text-foreground after:bg-primary"
          : "text-muted-foreground hover:text-foreground after:bg-transparent"
      )}
    >
      {label}
    </Link>
  );
}
