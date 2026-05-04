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
 * - `turnoId` (opcional): si se está actualizando un turno existente, pásalo para excluirlo
 *   de la comparación consigo mismo.
 * - Los extremos tocándose no cuentan como solape: [10,14) y [14,18) son válidos.
 *
 * TODO(backend): implementar. Stub devuelve { solapa: false }.
 */
export function detectarSolape(
  _existentes: TurnoRango[],
  _nuevo: { empleadoId: string; fechaInicio: Date | string; fechaFin: Date | string },
  _opts?: { excluirTurnoId?: string }
): ResultadoSolape {
  throw new Error("detectarSolape: not implemented");
}
