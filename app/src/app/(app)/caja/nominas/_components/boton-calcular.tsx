"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { calcularNominasAction, type ResultadoCalculo } from "../actions";

type Estado =
  | { tipo: "idle" }
  | { tipo: "ok"; resumen: ResultadoCalculo }
  | { tipo: "error"; mensaje: string };

export function BotonCalcular({ bloqueado }: { bloqueado: boolean }) {
  const [pending, start] = useTransition();
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" });

  const onClick = () => {
    start(async () => {
      const res = await calcularNominasAction();
      if (res.ok) {
        setEstado({ tipo: "ok", resumen: res.data });
      } else {
        setEstado({ tipo: "error", mensaje: res.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button onClick={onClick} disabled={pending || bloqueado}>
          {pending ? "Calculando…" : "Calcular nóminas"}
        </Button>
        {bloqueado ? (
          <span className="text-xs text-muted-foreground">
            Bloqueado: requiere rol admin (hay nóminas pagadas).
          </span>
        ) : null}
      </div>
      {estado.tipo === "ok" ? (
        <p className="text-xs text-muted-foreground">
          Creadas: <strong>{estado.resumen.creadas}</strong> · Actualizadas:{" "}
          <strong>{estado.resumen.actualizadas}</strong> · Pagadas omitidas:{" "}
          <strong>{estado.resumen.pagadasOmitidas}</strong> · Voluntarios omitidos:{" "}
          <strong>{estado.resumen.voluntariosOmitidos}</strong>
        </p>
      ) : null}
      {estado.tipo === "error" ? (
        <p className="text-xs text-destructive-foreground bg-destructive/90 rounded-sm px-2 py-1">
          {estado.mensaje}
        </p>
      ) : null}
    </div>
  );
}
