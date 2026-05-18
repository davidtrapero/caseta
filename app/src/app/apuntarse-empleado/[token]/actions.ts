"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/action-result";
import { parseForm, toActionError } from "@/lib/action-result";
import { formDataToObject } from "@/lib/forms";
import { withAuditContext } from "@/lib/audit";
import { crearSolicitudEmpleadoSchema } from "./schema";
import { detectarSolape } from "@/lib/turnos-solape";
import { calcularHuecosEmpleado } from "@/app/(app)/turnos/_lib/huecos-empleado";

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function buscarEmpleadoPorDniAction(
  formData: FormData
): Promise<
  ActionResult<{
    encontrado: boolean;
    datos?: { nombre: string; email?: string; telefono?: string };
  }>
> {
  try {
    // Extraer y validar DNI
    const dni = (formData.get("dni") as string)?.trim() ?? "";
    if (!dni) {
      return { ok: true, data: { encontrado: false } };
    }

    // Obtener IP del cliente
    const ip = await getClientIp();

    // Verificar rate-limit
    const rl = checkRateLimit(ip, "apuntarse-empleado-lookup", 20, 60_000);
    if (!rl.allowed) {
      return { ok: true, data: { encontrado: false } };
    }

    // Buscar empleado por DNI
    const empleado = await prisma.empleado.findUnique({
      where: { dni },
      select: {
        nombre: true,
        email: true,
        telefono: true,
        activo: true,
        esVoluntario: true,
      },
    });

    // Retornar false si no encontrado, inactivo o voluntario
    if (!empleado || !empleado.activo || empleado.esVoluntario) {
      return { ok: true, data: { encontrado: false } };
    }

    // Retornar datos del empleado
    return {
      ok: true,
      data: {
        encontrado: true,
        datos: {
          nombre: empleado.nombre,
          email: empleado.email ?? undefined,
          telefono: empleado.telefono ?? undefined,
        },
      },
    };
  } catch {
    // Respuesta uniforme en caso de error (seguridad contra enumeración)
    return { ok: true, data: { encontrado: false } };
  }
}

export async function crearSolicitudEmpleadoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  // 1. Serializar FormData para recuperación de valores en error
  const values = formDataToObject(formData);

  // 2. Validar token
  const token = formData.get("_token");
  if (typeof token !== "string" || token.length < 20) {
    return { ok: false, error: "Enlace inválido.", values };
  }

  // 3. Rate-limit
  const ip = await getClientIp();
  const rl = checkRateLimit(ip, "apuntarse-empleado-crear", 10, 60_000);
  if (!rl.allowed) {
    return {
      ok: false,
      error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo.",
      values,
    };
  }

  // 4. Parsear FormData con Zod
  let data: ReturnType<typeof crearSolicitudEmpleadoSchema.parse>;
  try {
    data = parseForm(crearSolicitudEmpleadoSchema, formData);
  } catch (err) {
    const result = toActionError(err);
    return { ...result, values } as ActionResult<{ id: string }>;
  }

  // 5. Transacción
  try {
    const solicitud = await withAuditContext(
      "public:apuntarse-empleado",
      () =>
        prisma.$transaction(async (tx) => {
          // 5a. Buscar edición por token
          const edicion = await tx.edicion.findUnique({
            where: { formularioToken: token },
            select: { id: true, activa: true },
          });

          if (!edicion) {
            const e = new Error("Enlace no válido o expirado.");
            (e as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = undefined;
            throw e;
          }
          if (!edicion.activa) {
            const e = new Error("La edición no está activa. El plazo de solicitudes está cerrado.");
            throw e;
          }

          // 5b. Buscar turnos solicitados
          const turnos = await tx.turno.findMany({
            where: {
              id: { in: data.turnoIds },
              edicionId: edicion.id,
            },
            select: {
              id: true,
              fechaInicio: true,
              fechaFin: true,
              casetaId: true,
            },
          });

          // 5c. Validar que todos los turnoIds existen en esta edición
          if (turnos.length !== data.turnoIds.length) {
            const e = new Error("Algunos turnos seleccionados no existen o no pertenecen a esta edición.");
            (e as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
              turnoIds: ["Turnos inválidos"],
            };
            throw Object.assign(e, {
              fieldErrors: { turnoIds: ["Turnos inválidos"] },
            });
          }

          // 5d. Validar solape entre los turnos de la propia solicitud
          // Construimos rangos con empleadoId ficticio para reusar detectarSolape
          const DUMMY_EMPLEADO = "__solicitud__";
          const rangos = turnos.map((t) => ({
            id: t.id,
            empleadoId: DUMMY_EMPLEADO,
            casetaId: t.casetaId,
            fechaInicio: t.fechaInicio,
            fechaFin: t.fechaFin,
          }));

          for (let i = 0; i < rangos.length; i++) {
            const actual = rangos[i]!;
            // Comparar contra los demás (excluir sí mismo por id)
            const resto = rangos.filter((_, j) => j !== i);
            const resultado = detectarSolape(resto, {
              empleadoId: DUMMY_EMPLEADO,
              fechaInicio: actual.fechaInicio,
              fechaFin: actual.fechaFin,
            });
            if (resultado.solapa) {
              throw Object.assign(
                new Error("Los turnos seleccionados se solapan entre sí."),
                { fieldErrors: { turnoIds: ["Turnos solapados"] } }
              );
            }
          }

          // 5e. Validar huecos disponibles
          const huecos = await calcularHuecosEmpleado(tx, edicion.id, {
            turnoIds: data.turnoIds,
          });

          const sinHueco = data.turnoIds.filter((id) => (huecos.get(id) ?? 0) <= 0);
          if (sinHueco.length > 0) {
            throw Object.assign(
              new Error("Sin plazas disponibles en algunos turnos."),
              {
                fieldErrors: {
                  turnoIds: [`Sin huecos: ${sinHueco.length} turno(s)`],
                },
              }
            );
          }

          // 5f. Crear la solicitud con sus turnos
          return tx.solicitudEmpleado.create({
            data: {
              edicionId: edicion.id,
              dni: data.dni,
              nombre: data.nombre,
              apellidos: data.apellidos ?? null,
              telefono: data.telefono ?? null,
              email: data.email ?? null,
              turnos: {
                createMany: {
                  data: data.turnoIds.map((turnoId) => ({ turnoId })),
                },
              },
            },
            select: { id: true },
          });
        })
    );

    return { ok: true, data: { id: solicitud.id } };
  } catch (err) {
    // Si el error lleva fieldErrors, devolverlos junto con values
    const withFieldErrors = err as Error & { fieldErrors?: Record<string, string[]> };
    if (withFieldErrors.fieldErrors) {
      return {
        ok: false,
        error: withFieldErrors.message,
        fieldErrors: withFieldErrors.fieldErrors,
        values,
      };
    }
    const base = toActionError(err);
    return { ...base, values } as ActionResult<{ id: string }>;
  }
}
