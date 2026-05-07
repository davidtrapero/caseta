"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PERFIL_LABEL, PERFIL_COLORES, type PerfilEmpleado } from "../../_lib/perfiles";

const FECHA_TURNO = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const HORA = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export type FilaEmpleado = {
  id: string;
  nombre: string;
  perfil: PerfilEmpleado;
  entidad: string | null;
  asistencias: Array<{
    id: string;
    casetaNombre: string;
    fechaInicio: string;
    fechaFin: string;
  }>;
};

export function TablaAsistencias({ filas }: { filas: FilaEmpleado[] }) {
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead className="w-32">Perfil</TableHead>
          <TableHead>Entidad</TableHead>
          <TableHead className="w-28 text-right">Asistencias</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((f) => {
          const abierta = expandidas.has(f.id);
          const colores = PERFIL_COLORES[f.perfil];
          return (
            <Fragment key={f.id}>
              <TableRow
                onClick={() => toggle(f.id)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {abierta ? "▾" : "▸"}
                    </span>
                    {f.nombre}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    style={{
                      backgroundColor: colores.bg,
                      borderColor: colores.border,
                      color: colores.text,
                    }}
                  >
                    {PERFIL_LABEL[f.perfil]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {f.entidad ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {f.asistencias.length}
                </TableCell>
              </TableRow>
              {abierta ? (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={4} className="py-3">
                    <ul className="text-sm flex flex-col gap-1 pl-6">
                      {f.asistencias.map((a) => (
                        <li key={a.id}>
                          <span className="font-mono text-xs text-muted-foreground">
                            {FECHA_TURNO.format(new Date(a.fechaInicio))}{" "}
                            {HORA.format(new Date(a.fechaInicio))}–
                            {HORA.format(new Date(a.fechaFin))}
                          </span>
                          {" · "}
                          <span>{a.casetaNombre}</span>
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
