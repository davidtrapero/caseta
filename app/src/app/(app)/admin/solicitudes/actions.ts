"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { detectarSolape, type TurnoRango } from "@/lib/turnos-solape";
import { calcularHuecosVoluntario } from "@/app/(app)/turnos/_lib/huecos";
import { construirAvisoRechazo } from "@/lib/voluntario-aviso";
import { enviarEmail } from "@/lib/email";
import {
  aprobarTurnosSchema,
  rechazarTurnosSchema,
  aprobarTurnosEmpleadoSchema,
  rechazarTurnosEmpleadoSchema,
  aprobarSolicitudEmpleadoSchema,
} from "./schema";
import { calcularHuecosEmpleado } from "@/app/(app)/turnos/_lib/huecos-empleado";
// El cliente Prisma de este proyecto va extendido (extensión de auditoría),
// así que `Prisma.TransactionClient` no encaja. Inferimos el tipo del callback
// que realmente recibe `$transaction` para mantener typing correcto.
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Recalcula el estado padre de la solicitud a partir de sus turnos hijos.
 * - Todos pendientes → `pendiente`
 * - Todos aprobados  → `aprobada`
 * - Todos rechazados → `rechazada`
 * - Mezcla aprobado/rechazado (sin pendientes) → `parcial`
 * - Si queda algún pendiente, mantiene `pendiente` (la solicitud sigue abierta).
 */
async function recalcularEstadoSolicitud(
  tx: Tx,
  solicitudId: string,
  userId: string
): Promise<void> {
  const turnos = await tx.solicitudVoluntarioTurno.findMany({
    where: { solicitudId },
    select: { estado: true },
  });
  if (turnos.length === 0) return;

  const pendientes = turnos.filter((t) => t.estado === "pendiente").length;
  const aprobados = turnos.filter((t) => t.estado === "aprobado").length;
  const rechazados = turnos.filter((t) => t.estado === "rechazado").length;

  let estado: "pendiente" | "aprobada" | "rechazada" | "parcial";
  if (pendientes > 0) estado = "pendiente";
  else if (aprobados === turnos.length) estado = "aprobada";
  else if (rechazados === turnos.length) estado = "rechazada";
  else estado = "parcial";

  const decidida = pendientes === 0;
  await tx.solicitudVoluntario.update({
    where: { id: solicitudId },
    data: {
      estado,
      decididaAt: decidida ? new Date() : null,
      decididaPorUserId: decidida ? userId : null,
    },
  });
}

export async function aprobarTurnosAction(
  _prev: ActionResult<{ id: string; aprobados: number }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string; aprobados: number }>> {
  try {
    const { user } = await requirePermiso("solicitudes.decidir");
    const data = parseForm(aprobarTurnosSchema, formData);

    const solicitudPrev = await prisma.solicitudVoluntario.findUnique({
      where: { id: data.solicitudId },
      include: {
        turnos: {
          where: { id: { in: data.turnoIds } },
          include: { turno: true },
        },
      },
    });
    if (!solicitudPrev) throw new Error("Solicitud no encontrada.");

    const aResolverPrev = solicitudPrev.turnos.filter((t) => t.estado === "pendiente");
    if (aResolverPrev.length === 0) {
      throw new Error("Los turnos seleccionados ya fueron resueltos.");
    }

    const tipoVoluntarioPrev = await prisma.tipoEmpleado.findFirst({
      where: { esVoluntario: true, activo: true },
      select: { id: true },
    });
    if (!tipoVoluntarioPrev) {
      throw new Error("No hay ninguna categoría marcada como voluntariado.");
    }

    const empleadoExistentePrev = solicitudPrev.telefono
      ? await prisma.empleado.findFirst({
          where: {
            telefono: solicitudPrev.telefono,
            tipos: { some: { tipoEmpleadoId: tipoVoluntarioPrev.id } },
          },
          select: { id: true },
        })
      : null;

    if (empleadoExistentePrev) {
      const fechasOrden = aResolverPrev
        .map((t) => t.turno.fechaInicio.getTime())
        .concat(aResolverPrev.map((t) => t.turno.fechaFin.getTime()));
      const minIni = new Date(Math.min(...fechasOrden));
      const maxFin = new Date(Math.max(...fechasOrden));
      const ventanaIni = new Date(minIni.getTime() - 24 * 60 * 60 * 1000);
      const ventanaFin = new Date(maxFin.getTime() + 24 * 60 * 60 * 1000);

      const asignacionesExistentes = await prisma.turnoEmpleado.findMany({
        where: {
          empleadoId: empleadoExistentePrev.id,
          turno: { fechaInicio: { gte: ventanaIni, lt: ventanaFin } },
        },
        include: { turno: true },
      });
      const existentes: TurnoRango[] = asignacionesExistentes.map((a) => ({
        id: a.turno.id,
        empleadoId: empleadoExistentePrev.id,
        casetaId: a.turno.casetaId,
        fechaInicio: a.turno.fechaInicio,
        fechaFin: a.turno.fechaFin,
      }));
      const nuevos: TurnoRango[] = aResolverPrev.map((t) => ({
        id: t.turno.id,
        empleadoId: empleadoExistentePrev.id,
        casetaId: t.turno.casetaId,
        fechaInicio: t.turno.fechaInicio,
        fechaFin: t.turno.fechaFin,
      }));

      for (let i = 0; i < nuevos.length; i++) {
        const candidato = nuevos[i]!;
        const otrosNuevos = nuevos.filter((_, j) => j !== i);
        const r = detectarSolape([...existentes, ...otrosNuevos], {
          empleadoId: empleadoExistentePrev.id,
          fechaInicio: candidato.fechaInicio,
          fechaFin: candidato.fechaFin,
        });
        if (r.solapa) {
          const err = new Error(
            "Hay solapamiento con otros turnos de esta persona. Revisa antes de aprobar."
          );
          (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
            turnos: ["Solape detectado"],
          };
          throw err;
        }
      }
    }

    const result = await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        const solicitud = await tx.solicitudVoluntario.findUnique({
          where: { id: data.solicitudId },
          include: {
            turnos: {
              where: { id: { in: data.turnoIds } },
              include: { turno: true },
            },
          },
        });
        if (!solicitud) throw new Error("Solicitud no encontrada.");

        const aResolver = solicitud.turnos.filter((t) => t.estado === "pendiente");
        if (aResolver.length === 0) {
          throw new Error("Los turnos seleccionados ya fueron resueltos.");
        }

        const tipoVoluntario = await tx.tipoEmpleado.findFirst({
          where: { esVoluntario: true, activo: true },
          select: { id: true },
        });
        if (!tipoVoluntario) {
          throw new Error("No hay ninguna categoría marcada como voluntariado.");
        }

        // Empleado: reutiliza por teléfono+tipo voluntario; si no existe, lo crea.
        let empleado = solicitud.telefono
          ? await tx.empleado.findFirst({
              where: {
                telefono: solicitud.telefono,
                tipos: { some: { tipoEmpleadoId: tipoVoluntario.id } },
              },
              select: { id: true, entidadId: true, activo: true, email: true },
            })
          : null;

        if (!empleado) {
          empleado = await tx.empleado.create({
            data: {
              nombre: solicitud.nombre,
              esVoluntario: true,
              tipos: { create: [{ tipoEmpleadoId: tipoVoluntario.id }] },
              telefono: solicitud.telefono,
              email: solicitud.email ?? null,
              entidadId: solicitud.entidadId,
              activo: true,
              jornalDiario: null,
            },
            select: { id: true, entidadId: true, activo: true, email: true },
          });
        } else {
          const updates: { entidadId?: string; email?: string } = {};
          if (empleado.entidadId !== solicitud.entidadId) {
            updates.entidadId = solicitud.entidadId;
          }
          // Sólo rellenamos email si el empleado no tiene uno (no sobreescribir).
          if (!empleado.email && solicitud.email) {
            updates.email = solicitud.email;
          }
          if (Object.keys(updates).length > 0) {
            await tx.empleado.update({
              where: { id: empleado.id },
              data: updates,
            });
          }
        }

        if (!empleado.activo) {
          throw new Error("El personal asociado está desactivado.");
        }

        const turnoIds = aResolver.map((t) => t.turnoId);

        // Validación de huecos por turno (excluye esta solicitud para no contarse a sí misma).
        const huecos = await calcularHuecosVoluntario(tx, solicitud.edicionId, {
          turnoIds,
          excluirSolicitudId: solicitud.id,
        });
        const sinHueco = turnoIds.filter((id) => (huecos.get(id) ?? 0) <= 0);
        if (sinHueco.length > 0) {
          const err = new Error("Algunos turnos ya no tienen huecos disponibles.");
          (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
            turnos: [`${sinHueco.length} turno(s) sin huecos`],
          };
          throw err;
        }

        // Marca los turnos solicitados como aprobados.
        await tx.solicitudVoluntarioTurno.updateMany({
          where: {
            id: { in: aResolver.map((t) => t.id) },
            estado: "pendiente",
          },
          data: {
            estado: "aprobado",
            decididaAt: new Date(),
            decididaPorUserId: user.id,
          },
        });

        // Crea las asignaciones reales en el calendario.
        await tx.turnoEmpleado.createMany({
          data: turnoIds.map((turnoId) => ({
            turnoId,
            empleadoId: empleado!.id,
            tipoImputadoId: tipoVoluntario.id,
            asistio: false,
          })),
          skipDuplicates: true,
        });

        await recalcularEstadoSolicitud(tx, solicitud.id, user.id);

        return { id: solicitud.id, aprobados: aResolver.length };
      })
    );

    revalidatePath("/admin/solicitudes");
    revalidatePath("/turnos");
    return { ok: true, data: result };
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

type RechazarResult = {
  solicitudId: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  motivo: string;
  rechazados: number;
  emailEnviado: boolean;
  mailto: string | null;
  whatsappUrl: string | null;
};

export async function rechazarTurnosAction(
  _prev: ActionResult<RechazarResult> | null,
  formData: FormData
): Promise<ActionResult<RechazarResult>> {
  try {
    const { user } = await requirePermiso("solicitudes.decidir");
    const data = parseForm(rechazarTurnosSchema, formData);

    const result = await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        const solicitud = await tx.solicitudVoluntario.findUnique({
          where: { id: data.solicitudId },
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            turnos: {
              where: { id: { in: data.turnoIds } },
              select: { id: true, estado: true },
            },
          },
        });
        if (!solicitud) throw new Error("Solicitud no encontrada.");

        const aRechazar = solicitud.turnos.filter((t) => t.estado === "pendiente");
        if (aRechazar.length === 0) {
          throw new Error("Los turnos seleccionados ya fueron resueltos.");
        }

        await tx.solicitudVoluntarioTurno.updateMany({
          where: {
            id: { in: aRechazar.map((t) => t.id) },
            estado: "pendiente",
          },
          data: {
            estado: "rechazado",
            motivoRechazo: data.motivo,
            decididaAt: new Date(),
            decididaPorUserId: user.id,
          },
        });

        // Detalle de los turnos rechazados para enriquecer las plantillas.
        const detalle = await tx.solicitudVoluntarioTurno.findMany({
          where: { id: { in: aRechazar.map((t) => t.id) } },
          include: {
            turno: {
              select: {
                fechaInicio: true,
                caseta: { select: { nombre: true } },
              },
            },
          },
        });

        await recalcularEstadoSolicitud(tx, solicitud.id, user.id);

        const fechasArr = [
          ...new Set(
            detalle.map((d) => d.turno.fechaInicio.toISOString().slice(0, 10))
          ),
        ].sort();
        const casetasArr = [
          ...new Set(detalle.map((d) => d.turno.caseta.nombre)),
        ];

        return {
          solicitudId: solicitud.id,
          nombre: solicitud.nombre,
          email: solicitud.email,
          telefono: solicitud.telefono,
          motivo: data.motivo,
          rechazados: aRechazar.length,
          casetas: casetasArr.join(", "),
          fechas: fechasArr.join(", "),
        };
      })
    );

    // Construir aviso (mailto + wa.me) con plantillas de BD para devolver al
    // cliente. Si hay email, intenta enviar automáticamente — el fallo NO
    // aborta el rechazo (la transacción ya se cerró).
    const aviso = await construirAvisoRechazo({
      email: result.email,
      telefono: result.telefono,
      vars: {
        nombre: result.nombre,
        motivo: result.motivo,
        turnos: String(result.rechazados),
        caseta: result.casetas,
        fechas: result.fechas,
      },
    });

    let emailEnviado = false;
    if (result.email) {
      const env = await enviarEmail({
        to: result.email,
        subject: aviso.asunto,
        text: aviso.cuerpoEmail,
      });
      emailEnviado = env.ok;
    }

    // Nota: NO revalidamos aquí. El cliente abre un aviso post-rechazo con
    // botones de WhatsApp/email; si revalidamos, este componente se desmonta
    // antes de que el aviso aparezca. La revalidación se dispara desde el
    // cliente al cerrar el aviso (router.refresh()).
    return {
      ok: true,
      data: {
        solicitudId: result.solicitudId,
        nombre: result.nombre,
        email: result.email,
        telefono: result.telefono,
        motivo: result.motivo,
        rechazados: result.rechazados,
        emailEnviado,
        mailto: aviso.mailto,
        whatsappUrl: aviso.whatsappUrl,
      },
    };
  } catch (err) {
    return toActionError(err);
  }
}

// ─── Acciones para SolicitudEmpleado ────────────────────────────────────────

async function recalcularEstadoSolicitudEmpleado(
  tx: Tx,
  solicitudId: string,
  userId: string
): Promise<void> {
  const turnos = await tx.solicitudEmpleadoTurno.findMany({
    where: { solicitudId },
    select: { estado: true },
  });
  if (turnos.length === 0) return;

  const pendientes = turnos.filter((t) => t.estado === "pendiente").length;
  const aprobados = turnos.filter((t) => t.estado === "aprobado").length;
  const rechazados = turnos.filter((t) => t.estado === "rechazado").length;

  let estado: "pendiente" | "aprobada" | "rechazada" | "parcial";
  if (pendientes > 0) estado = "pendiente";
  else if (aprobados === turnos.length) estado = "aprobada";
  else if (rechazados === turnos.length) estado = "rechazada";
  else estado = "parcial";

  const decidida = pendientes === 0;
  await tx.solicitudEmpleado.update({
    where: { id: solicitudId },
    data: {
      estado,
      decididaAt: decidida ? new Date() : null,
      decididaPorUserId: decidida ? userId : null,
    },
  });
}

export async function aprobarTurnosEmpleadoAction(
  _prev: ActionResult<{ id: string; aprobados: number }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string; aprobados: number }>> {
  try {
    const { user } = await requirePermiso("solicitudes.decidir");
    const data = parseForm(aprobarTurnosEmpleadoSchema, formData);

    const solicitudPrev = await prisma.solicitudEmpleado.findUnique({
      where: { id: data.solicitudId },
      include: {
        turnos: {
          where: { id: { in: data.turnoIds } },
          include: { turno: true },
        },
      },
    });
    if (!solicitudPrev) throw new Error("Solicitud no encontrada.");

    const aResolverPrev = solicitudPrev.turnos.filter((t) => t.estado === "pendiente");
    if (aResolverPrev.length === 0) {
      throw new Error("Los turnos seleccionados ya fueron resueltos.");
    }

    const empleadoPrev = await prisma.empleado.findUnique({
      where: { dni: solicitudPrev.dni },
      select: { id: true },
    });

    if (empleadoPrev) {
      const fechasOrden = aResolverPrev
        .map((t) => t.turno.fechaInicio.getTime())
        .concat(aResolverPrev.map((t) => t.turno.fechaFin.getTime()));
      const minIni = new Date(Math.min(...fechasOrden));
      const maxFin = new Date(Math.max(...fechasOrden));
      const ventanaIni = new Date(minIni.getTime() - 24 * 60 * 60 * 1000);
      const ventanaFin = new Date(maxFin.getTime() + 24 * 60 * 60 * 1000);

      const asignacionesExistentes = await prisma.turnoEmpleado.findMany({
        where: {
          empleadoId: empleadoPrev.id,
          turno: { fechaInicio: { gte: ventanaIni, lt: ventanaFin } },
        },
        include: { turno: true },
      });
      const existentes: TurnoRango[] = asignacionesExistentes.map((a) => ({
        id: a.turno.id,
        empleadoId: empleadoPrev.id,
        casetaId: a.turno.casetaId,
        fechaInicio: a.turno.fechaInicio,
        fechaFin: a.turno.fechaFin,
      }));
      const nuevos: TurnoRango[] = aResolverPrev.map((t) => ({
        id: t.turno.id,
        empleadoId: empleadoPrev.id,
        casetaId: t.turno.casetaId,
        fechaInicio: t.turno.fechaInicio,
        fechaFin: t.turno.fechaFin,
      }));

      for (let i = 0; i < nuevos.length; i++) {
        const candidato = nuevos[i]!;
        const otrosNuevos = nuevos.filter((_, j) => j !== i);
        const r = detectarSolape([...existentes, ...otrosNuevos], {
          empleadoId: empleadoPrev.id,
          fechaInicio: candidato.fechaInicio,
          fechaFin: candidato.fechaFin,
        });
        if (r.solapa) {
          const err = new Error(
            "Hay solapamiento con otros turnos de esta persona. Revisa antes de aprobar."
          );
          (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
            turnos: ["Solape detectado"],
          };
          throw err;
        }
      }
    }

    const result = await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        const solicitud = await tx.solicitudEmpleado.findUnique({
          where: { id: data.solicitudId },
          include: {
            turnos: {
              where: { id: { in: data.turnoIds } },
              include: { turno: true },
            },
          },
        });
        if (!solicitud) throw new Error("Solicitud no encontrada.");

        const aResolver = solicitud.turnos.filter((t) => t.estado === "pendiente");
        if (aResolver.length === 0) {
          throw new Error("Los turnos seleccionados ya fueron resueltos.");
        }

        // Resolver tipo de empleado contratado (esVoluntario=false).
        const tipoEmpleado = await tx.tipoEmpleado.findFirst({
          where: { esVoluntario: false, activo: true },
          select: { id: true },
        });
        if (!tipoEmpleado) {
          throw new Error("No hay ninguna categoría de personal contratado activa configurada.");
        }

        // Buscar empleado por DNI.
        const empleado = await tx.empleado.findUnique({
          where: { dni: solicitud.dni },
          select: { id: true, activo: true },
        });
        if (!empleado) {
          throw new Error(`No se encontró ningún empleado con DNI ${solicitud.dni}.`);
        }
        if (!empleado.activo) {
          throw new Error("La persona asociada está desactivada.");
        }

        const turnoIds = aResolver.map((t) => t.turnoId);

        // Validación de huecos.
        const huecos = await calcularHuecosEmpleado(tx, solicitud.edicionId, {
          turnoIds,
          excluirSolicitudId: solicitud.id,
        });
        const sinHueco = turnoIds.filter((id) => (huecos.get(id) ?? 0) <= 0);
        if (sinHueco.length > 0) {
          const err = new Error("Algunos turnos ya no tienen huecos disponibles.");
          (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
            turnos: [`${sinHueco.length} turno(s) sin huecos`],
          };
          throw err;
        }

        // Marca los turnos como aprobados.
        await tx.solicitudEmpleadoTurno.updateMany({
          where: {
            id: { in: aResolver.map((t) => t.id) },
            estado: "pendiente",
          },
          data: {
            estado: "aprobado",
            decididaAt: new Date(),
            decididaPorUserId: user.id,
          },
        });

        // Crea las asignaciones reales.
        await tx.turnoEmpleado.createMany({
          data: turnoIds.map((turnoId) => ({
            turnoId,
            empleadoId: empleado.id,
            tipoImputadoId: tipoEmpleado.id,
            asistio: false,
          })),
          skipDuplicates: true,
        });

        await recalcularEstadoSolicitudEmpleado(tx, solicitud.id, user.id);

        return { id: solicitud.id, aprobados: aResolver.length };
      })
    );

    revalidatePath("/admin/solicitudes");
    revalidatePath("/turnos");
    return { ok: true, data: result };
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

/**
 * Decide toda una SolicitudEmpleado de una vez: aprueba o rechaza todos sus turnos.
 *
 * Si aprueba:
 *  - Busca o crea el Empleado por DNI (errora si es voluntario).
 *  - Valida huecos y solapes para cada turno.
 *  - Crea TurnoEmpleado por cada turno de la solicitud.
 *  - Actualiza SolicitudEmpleado + SolicitudEmpleadoTurno a "aprobada/aprobado".
 *
 * Si rechaza:
 *  - Actualiza SolicitudEmpleado a "rechazada" con motivoRechazo.
 *
 * userId se pasa desde el componente cliente para evitar re-leer la sesión
 * dentro de la transacción (Edge runtime / RSC compatibility).
 */
export async function aprobarSolicitudEmpleadoAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
  userId: string
): Promise<ActionResult<null>> {
  try {
    // Auth: requiere permiso de decidir solicitudes
    await requirePermiso("solicitudes.decidir");

    const data = parseForm(aprobarSolicitudEmpleadoSchema, formData);

    if (data.aprobar) {
      const solicitudPrev = await prisma.solicitudEmpleado.findUnique({
        where: { id: data.solicitudId },
        include: {
          turnos: {
            include: {
              turno: {
                select: {
                  id: true,
                  casetaId: true,
                  fechaInicio: true,
                  fechaFin: true,
                },
              },
            },
          },
        },
      });
      if (!solicitudPrev) throw new Error("Solicitud no encontrada.");

      const empleadoPrev = await prisma.empleado.findUnique({
        where: { dni: solicitudPrev.dni },
        select: { id: true },
      });

      if (empleadoPrev && solicitudPrev.turnos.length > 0) {
        const fechasOrden = solicitudPrev.turnos
          .map((t) => t.turno.fechaInicio.getTime())
          .concat(solicitudPrev.turnos.map((t) => t.turno.fechaFin.getTime()));
        const minIni = new Date(Math.min(...fechasOrden));
        const maxFin = new Date(Math.max(...fechasOrden));
        const ventanaIni = new Date(minIni.getTime() - 24 * 60 * 60 * 1000);
        const ventanaFin = new Date(maxFin.getTime() + 24 * 60 * 60 * 1000);

        const asignacionesExistentes = await prisma.turnoEmpleado.findMany({
          where: {
            empleadoId: empleadoPrev.id,
            turno: { fechaInicio: { gte: ventanaIni, lt: ventanaFin } },
          },
          include: { turno: true },
        });
        const existentes: TurnoRango[] = asignacionesExistentes.map((a) => ({
          id: a.turno.id,
          empleadoId: empleadoPrev.id,
          casetaId: a.turno.casetaId,
          fechaInicio: a.turno.fechaInicio,
          fechaFin: a.turno.fechaFin,
        }));
        const nuevos: TurnoRango[] = solicitudPrev.turnos.map((t) => ({
          id: t.turno.id,
          empleadoId: empleadoPrev.id,
          casetaId: t.turno.casetaId,
          fechaInicio: t.turno.fechaInicio,
          fechaFin: t.turno.fechaFin,
        }));

        for (let i = 0; i < nuevos.length; i++) {
          const candidato = nuevos[i]!;
          const otrosNuevos = nuevos.filter((_, j) => j !== i);
          const r = detectarSolape([...existentes, ...otrosNuevos], {
            empleadoId: empleadoPrev.id,
            fechaInicio: candidato.fechaInicio,
            fechaFin: candidato.fechaFin,
          });
          if (r.solapa) {
            const err = new Error(
              "Hay solapamiento con otros turnos de esta persona. Revisa antes de aprobar."
            );
            (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
              turnos: ["Solape detectado"],
            };
            throw err;
          }
        }
      }
    }

    await withAuditContext(userId, () =>
      prisma.$transaction(async (tx) => {
        // Cargar solicitud con edición y turnos
        const solicitud = await tx.solicitudEmpleado.findUnique({
          where: { id: data.solicitudId },
          include: {
            edicion: { select: { id: true } },
            turnos: {
              include: {
                turno: {
                  select: {
                    id: true,
                    casetaId: true,
                    fechaInicio: true,
                    fechaFin: true,
                  },
                },
              },
            },
          },
        });
        if (!solicitud) throw new Error("Solicitud no encontrada.");

        // ── Rechazo ──────────────────────────────────────────────────────
        if (!data.aprobar) {
          await tx.solicitudEmpleado.update({
            where: { id: solicitud.id },
            data: {
              estado: "rechazada",
              motivoRechazo: data.motivoRechazo ?? null,
              decididaAt: new Date(),
              decididaPorUserId: userId,
            },
          });
          return;
        }

        // ── Aprobación ───────────────────────────────────────────────────

        // 1. Resolver tipo empleado contratado
        const tipoEmpleado = await tx.tipoEmpleado.findFirst({
          where: { esVoluntario: false, activo: true },
          select: { id: true },
        });
        if (!tipoEmpleado) {
          throw new Error("No hay ninguna categoría de personal contratado activa configurada.");
        }

        // 2. Buscar o crear Empleado por DNI
        let empleadoId: string;
        const empleadoExistente = await tx.empleado.findUnique({
          where: { dni: solicitud.dni },
          select: { id: true, esVoluntario: true, activo: true },
        });

        if (empleadoExistente) {
          if (empleadoExistente.esVoluntario) {
            throw new Error(
              "La persona registrada con este DNI pertenece al voluntariado. No se puede aprobar como contratada."
            );
          }
          // Actualizar datos del empleado con la info de la solicitud
          await tx.empleado.update({
            where: { id: empleadoExistente.id },
            data: {
              nombre: solicitud.nombre,
              email: solicitud.email ?? undefined,
              telefono: solicitud.telefono ?? undefined,
            },
          });
          empleadoId = empleadoExistente.id;
        } else {
          // Crear nuevo empleado
          const nuevo = await tx.empleado.create({
            data: {
              nombre: solicitud.nombre,
              email: solicitud.email ?? null,
              telefono: solicitud.telefono ?? null,
              dni: solicitud.dni,
              esVoluntario: false,
              activo: true,
              tipos: { create: [{ tipoEmpleadoId: tipoEmpleado.id }] },
            },
            select: { id: true },
          });
          empleadoId = nuevo.id;
        }

        const turnoIds = solicitud.turnos.map((t) => t.turnoId);

        // 3. Validar huecos (re-verificación al momento de aprobar)
        const huecos = await calcularHuecosEmpleado(tx, solicitud.edicion.id, {
          turnoIds,
          excluirSolicitudId: solicitud.id,
        });
        const sinHueco = turnoIds.filter((id) => (huecos.get(id) ?? 0) <= 0);
        if (sinHueco.length > 0) {
          const err = new Error("Algunos turnos ya no tienen huecos disponibles.");
          (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
            turnos: [`${sinHueco.length} turno(s) sin huecos`],
          };
          throw err;
        }

        // 5. Crear asignaciones TurnoEmpleado
        await tx.turnoEmpleado.createMany({
          data: turnoIds.map((turnoId) => ({
            turnoId,
            empleadoId,
            tipoImputadoId: tipoEmpleado.id,
            asistio: false,
          })),
          skipDuplicates: true,
        });

        // 6. Actualizar SolicitudEmpleado → aprobada
        await tx.solicitudEmpleado.update({
          where: { id: solicitud.id },
          data: {
            estado: "aprobada",
            decididaAt: new Date(),
            decididaPorUserId: userId,
          },
        });

        // 7. Actualizar todos los SolicitudEmpleadoTurno → aprobado
        await tx.solicitudEmpleadoTurno.updateMany({
          where: { solicitudId: solicitud.id },
          data: {
            estado: "aprobado",
            decididaAt: new Date(),
            decididaPorUserId: userId,
          },
        });
      })
    );

    revalidatePath("/admin/solicitudes");
    revalidatePath("/turnos");
    return { ok: true, data: null };
  } catch (err) {
    const fieldErrors =
      err instanceof Error
        ? (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors
        : undefined;
    if (fieldErrors) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Error",
        fieldErrors,
      };
    }
    return toActionError(err);
  }
}

export async function rechazarTurnosEmpleadoAction(
  _prev: ActionResult<{ solicitudId: string; rechazados: number }> | null,
  formData: FormData
): Promise<ActionResult<{ solicitudId: string; rechazados: number }>> {
  try {
    const { user } = await requirePermiso("solicitudes.decidir");
    const data = parseForm(rechazarTurnosEmpleadoSchema, formData);

    const result = await withAuditContext(user.id, () =>
      prisma.$transaction(async (tx) => {
        const solicitud = await tx.solicitudEmpleado.findUnique({
          where: { id: data.solicitudId },
          select: {
            id: true,
            turnos: {
              where: { id: { in: data.turnoIds } },
              select: { id: true, estado: true },
            },
          },
        });
        if (!solicitud) throw new Error("Solicitud no encontrada.");

        const aRechazar = solicitud.turnos.filter((t) => t.estado === "pendiente");
        if (aRechazar.length === 0) {
          throw new Error("Los turnos seleccionados ya fueron resueltos.");
        }

        await tx.solicitudEmpleadoTurno.updateMany({
          where: {
            id: { in: aRechazar.map((t) => t.id) },
            estado: "pendiente",
          },
          data: {
            estado: "rechazado",
            motivoRechazo: data.motivo,
            decididaAt: new Date(),
            decididaPorUserId: user.id,
          },
        });

        await recalcularEstadoSolicitudEmpleado(tx, solicitud.id, user.id);

        return { solicitudId: solicitud.id, rechazados: aRechazar.length };
      })
    );

    revalidatePath("/admin/solicitudes");
    return { ok: true, data: result };
  } catch (err) {
    return toActionError(err);
  }
}
