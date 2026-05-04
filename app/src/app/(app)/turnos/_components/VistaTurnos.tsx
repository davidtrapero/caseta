"use client";

import Link from "next/link";
import { ToastProvider } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer } from "lucide-react";
import type { SemanaTurnos } from "../types";
import { CalendarioSemana } from "./CalendarioSemana";
import { SelectorCaseta } from "./SelectorCaseta";
import { NavegadorSemana } from "./NavegadorSemana";
import { BannerReadonly } from "./BannerReadonly";
import { BotonDuplicarSemana } from "./BotonDuplicarSemana";
import { LeyendaEmpleados } from "./LeyendaEmpleados";
import { toWeekCode } from "../_lib/fechas";
import { fromIsoDate } from "../_lib/fechas";

export function VistaTurnos({ semana }: { semana: SemanaTurnos }) {
  const weekCode = toWeekCode(fromIsoDate(semana.lunes));
  const printHref = `/turnos/imprimir?casetaId=${semana.casetaSeleccionada.id}&semana=${weekCode}`;

  return (
    <ToastProvider>
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl">Turnos</h2>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <span>Edición:</span>
              <Badge variant={semana.edicion.activa ? "active" : "inactive"}>
                {semana.edicion.nombre}
              </Badge>
              {!semana.casetaSeleccionada.activa ? (
                <Badge variant="inactive">Caseta inactiva</Badge>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <SelectorCaseta
              casetas={semana.casetas}
              seleccionadaId={semana.casetaSeleccionada.id}
            />
            <NavegadorSemana lunesIso={semana.lunes} domingoIso={semana.domingo} />
          </div>
        </div>

        <BannerReadonly semana={semana} />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <LeyendaEmpleados turnos={semana.turnos} />
          <div className="flex items-center gap-2">
            {!semana.readonly ? (
              <BotonDuplicarSemana
                casetaId={semana.casetaSeleccionada.id}
                edicionId={semana.edicion.id}
                lunesIso={semana.lunes}
              />
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href={printHref} target="_blank" rel="noopener">
                <Printer className="h-4 w-4" />
                Imprimir
              </Link>
            </Button>
          </div>
        </div>

        <CalendarioSemana semana={semana} />
      </div>
    </ToastProvider>
  );
}
