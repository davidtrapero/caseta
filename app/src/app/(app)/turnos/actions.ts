"use server";

import type { ActionResult } from "@/lib/action-result";

// Server Actions del módulo Turnos.
// Firmas estables — implementación a cargo del agente backend.
// Patrón obligatorio en cada action:
//   1. requireRole(['admin', 'gerente'])  — cajero es solo lectura.
//   2. parseForm(<zodSchema>, formData)
//   3. Validaciones de negocio (edición activa, caseta/empleado activos, solape).
//   4. withAuditContext(user.id, () => prisma... )
//   5. revalidatePath('/turnos')
//   6. Retorno tipado ActionResult<T>  o  redirect().

export async function crearTurnoAction(
  _prev: ActionResult<{ id: string }> | null,
  _formData: FormData
): Promise<ActionResult<{ id: string }>> {
  throw new Error("crearTurnoAction: not implemented");
}

export async function actualizarTurnoAction(
  _prev: ActionResult<{ id: string }> | null,
  _formData: FormData
): Promise<ActionResult<{ id: string }>> {
  throw new Error("actualizarTurnoAction: not implemented");
}

export async function eliminarTurnoAction(
  _prev: ActionResult<undefined> | null,
  _formData: FormData
): Promise<ActionResult<undefined>> {
  throw new Error("eliminarTurnoAction: not implemented");
}

export async function toggleAsistenciaAction(
  _prev: ActionResult<{ asistio: boolean }> | null,
  _formData: FormData
): Promise<ActionResult<{ asistio: boolean }>> {
  throw new Error("toggleAsistenciaAction: not implemented");
}

/**
 * Duplica todos los turnos de (casetaId, semana origen) a la semana destino.
 * Si hay alguna colisión por solape en la semana destino → aborta con error sin tocar BD.
 * `asistio` siempre arranca en false en los turnos copiados.
 */
export async function duplicarSemanaAction(
  _prev: ActionResult<{ copiados: number }> | null,
  _formData: FormData
): Promise<ActionResult<{ copiados: number }>> {
  throw new Error("duplicarSemanaAction: not implemented");
}
