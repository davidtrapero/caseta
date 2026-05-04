"use client";

import { cn } from "@/lib/utils";
import { coloresEmpleado } from "../_lib/colores";
import type { TurnoSerializable } from "../types";

// Un "segmento" es la porción visual de un turno dentro de un día concreto.
// Cross-midnight produce dos segmentos (día A de startHour a 24, día B de 0 a endHour).
export type SegmentoTurno = {
  turno: TurnoSerializable;
  diaIso: string; // YYYY-MM-DD local del segmento
  horaInicio: number; // 0..24 (fraccional en teoría, pero aquí siempre entero)
  horaFin: number; // 0..24
  esCabecera: boolean; // el segmento que arranca el turno
};

export function BloqueTurno({
  segmento,
  hoyIso,
  readonly,
  filaPx,
  onClick,
  onToggleAsistencia,
  pendingAsistencia,
}: {
  segmento: SegmentoTurno;
  hoyIso: string;
  readonly: boolean;
  filaPx: number; // altura de una hora en px
  onClick: () => void;
  onToggleAsistencia: (next: boolean) => void;
  pendingAsistencia: boolean;
}) {
  const { turno, horaInicio, horaFin, esCabecera } = segmento;
  const top = horaInicio * filaPx;
  const height = Math.max(18, (horaFin - horaInicio) * filaPx - 2);

  const colores = coloresEmpleado(turno.empleadoId);
  const duracionH = (new Date(turno.fechaFin).getTime() - new Date(turno.fechaInicio).getTime()) / 3_600_000;
  const asistenciaEditable = segmento.diaIso <= hoyIso;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute left-1 right-1 rounded-md border-l-4 shadow-sm text-left overflow-hidden",
        "px-2 py-1 text-[11px] leading-tight",
        "transition-[transform,opacity] duration-150 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        !esCabecera && "opacity-85"
      )}
      style={{
        top,
        height,
        backgroundColor: `color-mix(in srgb, ${colores.backgroundColor} 85%, transparent)`,
        borderLeftColor: colores.borderColor,
        color: colores.color,
      }}
      aria-label={`Turno de ${turno.empleadoNombre}, ${duracionH}h`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-semibold truncate font-[var(--font-display)]">
          {turno.empleadoNombre}
        </span>
        <span className="font-mono text-[10px] opacity-90 shrink-0">
          {duracionH}h
        </span>
      </div>
      {esCabecera && height > 36 ? (
        <div className="font-mono text-[10px] opacity-90">
          {fmtHora(new Date(turno.fechaInicio))}–{fmtHora(new Date(turno.fechaFin))}
        </div>
      ) : null}
      {esCabecera && asistenciaEditable && !readonly && height > 48 ? (
        <label
          className="mt-1 inline-flex items-center gap-1 text-[10px] cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={turno.asistio}
            disabled={pendingAsistencia}
            onChange={(e) => onToggleAsistencia(e.target.checked)}
            className="h-3 w-3 accent-white"
          />
          <span>{turno.asistio ? "Asistió" : "Sin marcar"}</span>
        </label>
      ) : esCabecera && height > 36 ? (
        <div className="text-[10px] opacity-90">
          {turno.asistio ? "✓ asistió" : asistenciaEditable ? "· sin marcar" : ""}
        </div>
      ) : null}
    </button>
  );
}

function fmtHora(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}h`;
}
