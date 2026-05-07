"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { detectarSolape, type TurnoRango } from "@/lib/turnos-solape";
import { calcularHuecosVoluntario } from "@/app/(app)/turnos/_lib/huecos";
import { decidirSolicitudSchema } from "./schema";

export async function aprobarSolicitudAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(decidirSolicitudSchema, formData);

    const result = await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        const solicitud = await tx.solicitudVoluntario.findUnique({
          where: { id: data.solicitudId },
          include: {
            turnos: { include: { turno: true } },
            entidad: { select: { id: true, activa: true } },
          },
        });
        if (!solicitud) throw new Error("Solicitud no encontrada.");
        if (solicitud.estado !== "pendiente") {
          throw new Error("La solicitud ya fue resuelta.");
        }

        let empleado = await tx.empleado.findFirst({
          where: { telefono: solicitud.telefono, perfil: "voluntario" },
          select: { id: true, entidadId: true, activo: true },
        });

        if (!empleado) {
          const creado = await tx.empleado.create({
            data: {
              nombre: solicitud.nombre,
              perfil: "voluntario",
              telefono: solicitud.telefono,
              entidadId: solicitud.entidadId,
              activo: true,
              jornalDiario: null,
            },
            select: { id: true, entidadId: true, activo: true },
          });
          empleado = creado;
        } else if (empleado.entidadId !== solicitud.entidadId) {
          await tx.empleado.update({
            where: { id: empleado.id },
            data: { entidadId: solicitud.entidadId },
          });
        }

        if (!empleado.activo) {
          throw new Error("El empleado asociado está desactivado.");
        }

        const turnoIds = solicitud.turnos.map((t) => t.turnoId);

        const huecos = await calcularHuecosVoluntario(tx, solicitud.edicionId, {
          turnoIds,
          excluirSolicitudId: solicitud.id,
        });
        const sinHueco = turnoIds.filter((id) => (huecos.get(id) ?? 0) <= 0);
        if (sinHueco.length > 0) {
          const err = new Error(
            "Algunos turnos ya no tienen huecos disponibles."
          );
          (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
            turnos: [`${sinHueco.length} turno(s) sin huecos`],
          };
          throw err;
        }

        const fechasOrden = solicitud.turnos
          .map((t) => t.turno.fechaInicio.getTime())
          .concat(solicitud.turnos.map((t) => t.turno.fechaFin.getTime()));
        const minIni = new Date(Math.min(...fechasOrden));
        const maxFin = new Date(Math.max(...fechasOrden));
        const ventanaIni = new Date(minIni.getTime() - 24 * 60 * 60 * 1000);
        const ventanaFin = new Date(maxFin.getTime() + 24 * 60 * 60 * 1000);

        const asignacionesExistentes = await tx.turnoEmpleado.findMany({
          where: {
            empleadoId: empleado.id,
            turno: { fechaInicio: { gte: ventanaIni, lt: ventanaFin } },
          },
          include: { turno: true },
        });
        const existentes: TurnoRango[] = asignacionesExistentes.map((a) => ({
          id: a.turno.id,
          empleadoId: empleado.id,
          casetaId: a.turno.casetaId,
          fechaInicio: a.turno.fechaInicio,
          fechaFin: a.turno.fechaFin,
        }));

        const todosLosNuevos: TurnoRango[] = solicitud.turnos.map((t) => ({
          id: t.turno.id,
          empleadoId: empleado.id,
          casetaId: t.turno.casetaId,
          fechaInicio: t.turno.fechaInicio,
          fechaFin: t.turno.fechaFin,
        }));

        for (let i = 0; i < todosLosNuevos.length; i++) {
          const nuevo = todosLosNuevos[i]!;
          const otrosNuevos = todosLosNuevos.filter((_, j) => j !== i);
          const r = detectarSolape([...existentes, ...otrosNuevos], {
            empleadoId: empleado.id,
            fechaInicio: nuevo.fechaInicio,
            fechaFin: nuevo.fechaFin,
          });
          if (r.solapa) {
            const err = new Error(
              "Solape con otros turnos del empleado. Revisa antes de aprobar."
            );
            (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
              turnos: ["Solape detectado"],
            };
            throw err;
          }
        }

        // Marcar como aprobada ANTES de crear asignaciones: así una segunda
        // transacción concurrente falla en el check de estado al inicio.
        const actualizada = await tx.solicitudVoluntario.update({
          where: { id: solicitud.id },
          data: {
            estado: "aprobada",
            decididaAt: new Date(),
            decididaPorUserId: user.id,
          },
          select: { id: true },
        });

        await tx.turnoEmpleado.createMany({
          data: turnoIds.map((turnoId) => ({
            turnoId,
            empleadoId: empleado.id,
            asistio: false,
          })),
        });

        return actualizada;
      })
    );

    revalidatePath("/admin/solicitudes");
    revalidatePath("/turnos");
    return { ok: true, data: { id: result.id } };
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

export async function rechazarSolicitudAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin", "gerente"]);
    const data = parseForm(decidirSolicitudSchema, formData);

    const resultado = await withAuditContext(user.id, () =>
      prisma.solicitudVoluntario.updateMany({
        where: { id: data.solicitudId, estado: "pendiente" },
        data: {
          estado: "rechazada",
          decididaAt: new Date(),
          decididaPorUserId: user.id,
        },
      })
    );
    if (resultado.count === 0) {
      const existe = await prisma.solicitudVoluntario.findUnique({
        where: { id: data.solicitudId },
        select: { id: true },
      });
      return {
        ok: false,
        error: existe
          ? "La solicitud ya fue resuelta."
          : "Solicitud no encontrada.",
      };
    }

    revalidatePath("/admin/solicitudes");
    return { ok: true, data: { id: data.solicitudId } };
  } catch (err) {
    return toActionError(err);
  }
}
