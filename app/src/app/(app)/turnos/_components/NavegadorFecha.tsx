"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { addDays, formatFechaLarga } from "../_lib/fechas";
import { Button } from "@/components/ui/button";

type Props = {
  fecha: string; // YYYY-MM-DD
};

export function NavegadorFecha({ fecha }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();

  const href = (f: string) => {
    const sp = new URLSearchParams(params?.toString() ?? "");
    sp.set("fecha", f);
    return `${pathname}?${sp.toString()}`;
  };

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="icon" aria-label="Día anterior">
        <Link href={href(addDays(fecha, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>
      <div className="min-w-[16rem] text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Fecha
        </div>
        <div className="font-[var(--font-display)] text-lg leading-tight capitalize">
          {formatFechaLarga(fecha)}
        </div>
      </div>
      <Button asChild variant="outline" size="icon" aria-label="Día siguiente">
        <Link href={href(addDays(fecha, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
