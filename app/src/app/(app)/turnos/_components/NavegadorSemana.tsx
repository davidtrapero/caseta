"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, fromIsoDate, startOfWeek, toWeekCode, formatRangoSemana } from "../_lib/fechas";

export function NavegadorSemana({
  lunesIso,
  domingoIso,
}: {
  lunesIso: string;
  domingoIso: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const lunes = fromIsoDate(lunesIso);
  const domingo = fromIsoDate(domingoIso);

  function navegarA(nuevoLunes: Date) {
    const next = new URLSearchParams(params.toString());
    next.set("semana", toWeekCode(nuevoLunes));
    startTransition(() => router.replace(`/turnos?${next.toString()}`));
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Semana anterior"
        onClick={() => navegarA(addDays(lunes, -7))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navegarA(startOfWeek(new Date()))}
      >
        Hoy
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Semana siguiente"
        onClick={() => navegarA(addDays(lunes, 7))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <span className="ml-2 text-sm text-muted-foreground">
        {formatRangoSemana(lunes, domingo)}
      </span>
    </div>
  );
}
