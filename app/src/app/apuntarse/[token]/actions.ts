"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { detectarSolape, type TurnoRango } from "@/lib/turnos-solape";
import { calcularHuecosVoluntario } from "@/app/(app)/turnos/_lib/huecos";
import { checkRateLimit } from "@/lib/rate-limit";
import { crearSolicitudSchema } from "./schema";

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function crearSolicitudAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const token = formData.get("_token");
    if (typeof token !== "string" || token.length < 20) {
      return { ok: false, error: "Enlace inválido." };
    }

    const ip = await getClientIp();
    const rl = checkRateLimit(ip, "apuntarse", 10, 60_000);
    if (!rl.allowed) {
      return {
        ok: false,
        error: "Demasiadas solicitudes desde tu conexión. Espera un minuto e inténtalo de nuevo.",
      };
    }

    const data = parseForm(crearSolicitudSchema, formData);

    const solicitud = await withAuditContext("public:apuntarse", () =>
      prisma.$transaction(async (tx) => {
        const edicion = await tx.edicion.findUnique({
          where: { formularioToken: token },
          select: { id: true, activa: true },
        });
        if (!edicion || !edicion.activa) {
          throw new Error("El formulario ya no está disponible.");
        }

        const entidad = await tx.entidadVoluntario.findUnique({
          where: { id: data.entidadId },
          select: { activa: true },
        });
        if (!entidad || !entidad.activa) {
          const err = new Error("La entidad seleccionada ya no está disponible.");
          (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
            entidadId: ["Entidad no disponible"],
          };
          throw err;
        }

        const turnos = await tx.turno.findMany({
          where: { id: { in: data.turnoIds }, edicionId: edicion.id },
          select: {
            id: true,
            casetaId: true,
            fechaInicio: true,
            fechaFin: true,
          },
        });
        if (turnos.length !== data.turnoIds.length) {
          throw new Error("Alguno de los turnos elegidos ya no existe.");
        }

        const telefonoSinte = `tel:${data.telefono ?? data.email ?? data.nombre}`;
        const existentes: TurnoRango[] = turnos.map((t) => ({
          id: t.id,
          empleadoId: telefonoSinte,
          casetaId: t.casetaId,
          fechaInicio: t.fechaInicio,
          fechaFin: t.fechaFin,
        }));
        for (let i = 0; i < turnos.length; i++) {
          const t = turnos[i]!;
          const otros = existentes.filter((_, j) => j !== i);
          const r = detectarSolape(otros, {
            empleadoId: telefonoSinte,
            fechaInicio: t.fechaInicio,
            fechaFin: t.fechaFin,
          });
          if (r.solapa) {
            const err = new Error(
              "Los turnos seleccionados se solapan entre sí. Revisa el horario."
            );
            (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
              turnoIds: ["Turnos solapados"],
            };
            throw err;
          }
        }

        const huecos = await calcularHuecosVoluntario(tx, edicion.id, {
          turnoIds: data.turnoIds,
        });
        const sinHueco = data.turnoIds.filter((id) => (huecos.get(id) ?? 0) <= 0);
        if (sinHueco.length > 0) {
          const err = new Error(
            "Algunos turnos ya no tienen huecos disponibles. Refresca la página."
          );
          (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
            turnoIds: [`Sin huecos: ${sinHueco.length} turno(s)`],
          };
          throw err;
        }

        return tx.solicitudVoluntario.create({
          data: {
            edicionId: edicion.id,
            nombre: data.nombre,
            telefono: data.telefono ?? null,
            email: data.email ?? null,
            entidadId: data.entidadId,
            observaciones: data.observaciones ?? null,
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
    const fieldErrors =
      err instanceof Error
        ? (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors
        : undefined;
    if (fieldErrors) {
      return { ok: false, error: err instanceof Error ? err.message : "Error", fieldErrors };
    }
    return toActionError(err);
  }
}
