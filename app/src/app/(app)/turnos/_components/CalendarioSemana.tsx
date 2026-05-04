"use client";

import * as React from "react";
import type { SemanaTurnos, TurnoSerializable } from "../types";
import { addDays, fromIsoDate, nombreDiaCorto, toIsoDate } from "../_lib/fechas";
import { BloqueTurno, type SegmentoTurno } from "./BloqueTurno";
import { DialogoNuevoTurno } from "./DialogoNuevoTurno";
import { DialogoEditarTurno } from "./DialogoEditarTurno";
import { toggleAsistenciaAction } from "../actions";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const HORA_PX = 42; // altura de una hora
const HORA_INICIO = 0;
const HORA_FIN = 24;

type DialogoState =
  | { tipo: "cerrado" }
  | { tipo: "nuevo"; fechaInicioIso?: string }
  | { tipo: "editar"; turno: TurnoSerializable };

export function CalendarioSemana({ semana }: { semana: SemanaTurnos }) {
  const toast = useToast();
  const [dialogo, setDialogo] = React.useState<DialogoState>({ tipo: "cerrado" });
  const [toggling, setToggling] = React.useState<string | null>(null);

  const lunes = fromIsoDate(semana.lunes);
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i));

  // Agrupar segmentos por día.
  const segmentosPorDia = React.useMemo(() => {
    const map = new Map<string, SegmentoTurno[]>();
    for (const t of semana.turnos) {
      for (const seg of segmentarTurno(t)) {
        const arr = map.get(seg.diaIso) ?? [];
        arr.push(seg);
        map.set(seg.diaIso, arr);
      }
    }
    return map;
  }, [semana.turnos]);

  async function onToggleAsistencia(turno: TurnoSerializable, next: boolean) {
    setToggling(turno.id);
    try {
      const fd = new FormData();
      fd.set("turnoId", turno.id);
      fd.set("asistio", next ? "on" : "false");
      const res = await toggleAsistenciaAction(null, fd);
      if (!res.ok) toast.show(res.error, "error");
      else toast.show(next ? "Asistencia confirmada" : "Asistencia retirada", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al actualizar asistencia";
      toast.show(msg, "error");
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card/60 overflow-hidden">
        {/* Cabecera días */}
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-border bg-card">
          <div className="border-r border-border/70" />
          {dias.map((d) => {
            const esHoy = toIsoDate(d) === semana.hoyIso;
            return (
              <div
                key={d.toISOString()}
                className="px-2 py-2 border-r border-border/60 last:border-r-0 flex flex-col items-center"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {nombreDiaCorto(d)}
                </span>
                <span
                  className={
                    "font-mono text-sm " + (esHoy ? "text-primary font-bold" : "")
                  }
                >
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Grid horario */}
        <div
          className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] relative"
          style={{ animation: "fadeIn 200ms ease-out both" }}
        >
          {/* Columna de horas */}
          <div className="border-r border-border/70">
            {Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => (
              <div
                key={i}
                className="text-[10px] text-muted-foreground font-mono text-right pr-2 border-b border-border/30"
                style={{ height: HORA_PX }}
              >
                {String(HORA_INICIO + i).padStart(2, "0")}h
              </div>
            ))}
          </div>

          {/* Columnas días */}
          {dias.map((d) => {
            const diaIso = toIsoDate(d);
            const segs = segmentosPorDia.get(diaIso) ?? [];
            return (
              <div
                key={diaIso}
                className="relative border-r border-border/60 last:border-r-0 group"
              >
                {/* Líneas horarias */}
                {Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => (
                  <div
                    key={i}
                    className="border-b border-border/30"
                    style={{ height: HORA_PX }}
                    onDoubleClick={() => {
                      if (semana.readonly) return;
                      const fecha = new Date(d);
                      fecha.setHours(HORA_INICIO + i, 0, 0, 0);
                      setDialogo({ tipo: "nuevo", fechaInicioIso: fecha.toISOString() });
                    }}
                  />
                ))}

                {!semana.readonly ? (
                  <button
                    type="button"
                    aria-label={`Añadir turno en ${diaIso}`}
                    className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 rounded-full bg-primary text-primary-foreground h-6 w-6 flex items-center justify-center shadow"
                    onClick={() => {
                      const fecha = new Date(d);
                      fecha.setHours(9, 0, 0, 0);
                      setDialogo({ tipo: "nuevo", fechaInicioIso: fecha.toISOString() });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                ) : null}

                {/* Bloques */}
                {segs.map((seg, idx) => (
                  <BloqueTurno
                    key={`${seg.turno.id}-${idx}`}
                    segmento={seg}
                    hoyIso={semana.hoyIso}
                    readonly={semana.readonly}
                    filaPx={HORA_PX}
                    onClick={() => setDialogo({ tipo: "editar", turno: seg.turno })}
                    onToggleAsistencia={(next) => onToggleAsistencia(seg.turno, next)}
                    pendingAsistencia={toggling === seg.turno.id}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {!semana.readonly ? (
        <div className="mt-4 flex justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogo({ tipo: "nuevo" })}
          >
            <Plus className="h-4 w-4" />
            Nuevo turno
          </Button>
        </div>
      ) : null}

      {dialogo.tipo === "nuevo" ? (
        <DialogoNuevoTurno
          semana={semana}
          fechaInicioInicial={dialogo.fechaInicioIso}
          onClose={() => setDialogo({ tipo: "cerrado" })}
        />
      ) : null}

      {dialogo.tipo === "editar" ? (
        <DialogoEditarTurno
          semana={semana}
          turno={dialogo.turno}
          onClose={() => setDialogo({ tipo: "cerrado" })}
        />
      ) : null}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </>
  );
}

/** Convierte un Turno en uno o dos segmentos diarios. */
function segmentarTurno(turno: TurnoSerializable): SegmentoTurno[] {
  const inicio = new Date(turno.fechaInicio);
  const fin = new Date(turno.fechaFin);
  const diaInicio = toIsoDate(inicio);
  const diaFin = toIsoDate(fin);

  if (diaInicio === diaFin) {
    return [
      {
        turno,
        diaIso: diaInicio,
        horaInicio: inicio.getHours() + inicio.getMinutes() / 60,
        horaFin: fin.getHours() + fin.getMinutes() / 60,
        esCabecera: true,
      },
    ];
  }
  // Cross-midnight: dos segmentos.
  return [
    {
      turno,
      diaIso: diaInicio,
      horaInicio: inicio.getHours() + inicio.getMinutes() / 60,
      horaFin: 24,
      esCabecera: true,
    },
    {
      turno,
      diaIso: diaFin,
      horaInicio: 0,
      horaFin: fin.getHours() + fin.getMinutes() / 60 || 0.01,
      esCabecera: false,
    },
  ];
}
