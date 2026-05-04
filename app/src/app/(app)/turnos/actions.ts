"use server";

import type { ActionResult } from "@/lib/action-result";

// ----- STUBS Fase 3 -----
// El backend real lo implementa la rama `turnos-v2-backend`.
// Firmas congeladas como contrato para el frontend.

export async function crearTurnoAction(
  _prev: ActionResult<{ id: string }> | null,
  _formData: FormData
): Promise<ActionResult<{ id: string }>> {
  throw new Error("not implemented: crearTurnoAction");
}

export async function actualizarTurnoAction(
  _prev: ActionResult<{ id: string }> | null,
  _formData: FormData
): Promise<ActionResult<{ id: string }>> {
  throw new Error("not implemented: actualizarTurnoAction");
}

export async function eliminarTurnoAction(
  _prev: ActionResult<undefined> | null,
  _formData: FormData
): Promise<ActionResult<undefined>> {
  throw new Error("not implemented: eliminarTurnoAction");
}

export async function asignarEmpleadoAction(
  _prev: ActionResult<{ turnoId: string; empleadoId: string }> | null,
  _formData: FormData
): Promise<ActionResult<{ turnoId: string; empleadoId: string }>> {
  throw new Error("not implemented: asignarEmpleadoAction");
}

export async function desasignarEmpleadoAction(
  _prev: ActionResult<{ turnoId: string; empleadoId: string }> | null,
  _formData: FormData
): Promise<ActionResult<{ turnoId: string; empleadoId: string }>> {
  throw new Error("not implemented: desasignarEmpleadoAction");
}

export async function toggleAsistenciaAction(
  _prev: ActionResult<{ asistio: boolean }> | null,
  _formData: FormData
): Promise<ActionResult<{ asistio: boolean }>> {
  throw new Error("not implemented: toggleAsistenciaAction");
}

export async function duplicarDiaAction(
  _prev: ActionResult<{ copiados: number }> | null,
  _formData: FormData
): Promise<ActionResult<{ copiados: number }>> {
  throw new Error("not implemented: duplicarDiaAction");
}

export async function duplicarSemanaAction(
  _prev: ActionResult<{ copiados: number }> | null,
  _formData: FormData
): Promise<ActionResult<{ copiados: number }>> {
  throw new Error("not implemented: duplicarSemanaAction");
}
