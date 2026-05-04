import type { ResultadoSolape } from "@/app/(app)/turnos/types";

export type TurnoRango = {
  id: string;
  empleadoId: string;
  casetaId: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
};

/**
 * Determina si un turno nuevo o modificado solapa con turnos existentes del mismo empleado.
 *
 * Regla de negocio (ver plans/): se solapa si los intervalos [inicio, fin) comparten
 * cualquier instante, sin importar la caseta — un empleado no puede estar físicamente
 * en dos sitios a la vez.
 *
 * - `opts.excluirTurnoId` (opcional): si se está actualizando un turno existente, pásalo
 *   para excluirlo de la comparación consigo mismo.
 * - Los extremos tocándose no cuentan como solape: [10,14) y [14,18) son válidos.
 */
export function detectarSolape(
  existentes: TurnoRango[],
  nuevo: { empleadoId: string; fechaInicio: Date | string; fechaFin: Date | string },
  opts?: { excluirTurnoId?: string }
): ResultadoSolape {
  const nuevoInicio = toDate(nuevo.fechaInicio).getTime();
  const nuevoFin = toDate(nuevo.fechaFin).getTime();

  const conflictos: Array<{
    turnoId: string;
    empleadoId: string;
    casetaId: string;
    fechaInicio: string;
    fechaFin: string;
  }> = [];

  for (const t of existentes) {
    if (t.empleadoId !== nuevo.empleadoId) continue;
    if (opts?.excluirTurnoId && t.id === opts.excluirTurnoId) continue;

    const inicio = toDate(t.fechaInicio);
    const fin = toDate(t.fechaFin);

    // [a, b) ∩ [c, d) ≠ ∅  ⟺  a < d && c < b
    if (nuevoInicio < fin.getTime() && inicio.getTime() < nuevoFin) {
      conflictos.push({
        turnoId: t.id,
        empleadoId: t.empleadoId,
        casetaId: t.casetaId,
        fechaInicio: inicio.toISOString(),
        fechaFin: fin.toISOString(),
      });
    }
  }

  if (conflictos.length === 0) return { solapa: false };
  return { solapa: true, conflictos };
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}
