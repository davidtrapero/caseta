/**
 * Tests de integración para aprobarSolicitudEmpleadoAction.
 * Usan la BD de test (branch Neon) y resetDb() en beforeEach.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-reset";
import { signInAs } from "@/test/auth-helper";
import { crearEdicion, crearCaseta, crearUsuario } from "@/test/fixtures";
import { aprobarSolicitudEmpleadoAction } from "../actions";

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

/** Construye un FormData mínimo para la acción. */
function buildFormData(params: {
  solicitudId: string;
  aprobar: boolean;
  motivoRechazo?: string;
}): FormData {
  const fd = new FormData();
  fd.append("solicitudId", params.solicitudId);
  fd.append("aprobar", String(params.aprobar));
  if (params.motivoRechazo) fd.append("motivoRechazo", params.motivoRechazo);
  return fd;
}

// ──────────────────────────────────────────────────
// Suite
// ──────────────────────────────────────────────────

describe("aprobarSolicitudEmpleadoAction", () => {
  let edicionId: string;
  let casetaId: string;
  let tipoEmpleadoId: string;
  let userId: string;

  beforeEach(async () => {
    await resetDb();

    // Crear usuario admin y autenticarse
    const admin = await crearUsuario({
      email: "admin@caseta.test",
      name: "Admin Test",
      rol: "admin",
    });
    userId = admin.id;
    await signInAs("admin");

    const edicion = await crearEdicion({ anio: 2026 });
    edicionId = edicion.id;

    const caseta = await crearCaseta({ nombre: "Caseta Principal" });
    casetaId = caseta.id;

    // Resolver tipo empleado contratado (esVoluntario=false)
    const tipo = await prisma.tipoEmpleado.findFirst({
      where: { esVoluntario: false, activo: true },
      select: { id: true },
    });
    if (!tipo) throw new Error("No hay TipoEmpleado contratado en la BD de test");
    tipoEmpleadoId = tipo.id;
  });

  // ────────────────────────────────────────────────
  // Test 1: Aprobar solicitud y crear asignaciones
  // ────────────────────────────────────────────────
  it("aprueba la solicitud y crea las asignaciones TurnoEmpleado", async () => {
    // Crear turno con plaza libre
    const turno = await prisma.turno.create({
      data: {
        edicionId,
        casetaId,
        fechaInicio: new Date("2026-06-01T10:00:00Z"),
        fechaFin: new Date("2026-06-01T14:00:00Z"),
        plazas: { create: [{ tipoEmpleadoId, cantidad: 2 }] },
      },
    });

    // Crear empleado con DNI
    const empleado = await prisma.empleado.create({
      data: {
        nombre: "Juan",
        dni: "12345678A",
        esVoluntario: false,
        activo: true,
        tipos: { create: [{ tipoEmpleadoId }] },
      },
    });

    // Crear solicitud con el turno
    const solicitud = await prisma.solicitudEmpleado.create({
      data: {
        edicionId,
        dni: "12345678A",
        nombre: "Juan",
        estado: "pendiente",
        turnos: { create: [{ turnoId: turno.id }] },
      },
    });

    const fd = buildFormData({ solicitudId: solicitud.id, aprobar: true });
    const result = await aprobarSolicitudEmpleadoAction(null, fd, userId);

    expect(result.ok).toBe(true);

    // Verificar que se creó la asignación
    const asignacion = await prisma.turnoEmpleado.findFirst({
      where: { turnoId: turno.id, empleadoId: empleado.id },
    });
    expect(asignacion).not.toBeNull();
    expect(asignacion?.tipoImputadoId).toBe(tipoEmpleadoId);

    // Verificar que la solicitud quedó aprobada
    const solActualizada = await prisma.solicitudEmpleado.findUnique({
      where: { id: solicitud.id },
    });
    expect(solActualizada?.estado).toBe("aprobada");
    expect(solActualizada?.decididaAt).not.toBeNull();
    expect(solActualizada?.decididaPorUserId).toBe(userId);

    // Verificar que los turnos de solicitud quedaron aprobados
    const turnoSol = await prisma.solicitudEmpleadoTurno.findFirst({
      where: { solicitudId: solicitud.id },
    });
    expect(turnoSol?.estado).toBe("aprobado");
  });

  // ────────────────────────────────────────────────
  // Test 2: Crear Empleado si el DNI no existe
  // ────────────────────────────────────────────────
  it("crea un Empleado nuevo si el DNI no existe en la BD", async () => {
    const turno = await prisma.turno.create({
      data: {
        edicionId,
        casetaId,
        fechaInicio: new Date("2026-06-02T10:00:00Z"),
        fechaFin: new Date("2026-06-02T14:00:00Z"),
        plazas: { create: [{ tipoEmpleadoId, cantidad: 1 }] },
      },
    });

    const solicitud = await prisma.solicitudEmpleado.create({
      data: {
        edicionId,
        dni: "99999999Z",
        nombre: "Nuevo",
        apellidos: "Empleado",
        email: "nuevo@test.com",
        telefono: "600000001",
        estado: "pendiente",
        turnos: { create: [{ turnoId: turno.id }] },
      },
    });

    const fd = buildFormData({ solicitudId: solicitud.id, aprobar: true });
    const result = await aprobarSolicitudEmpleadoAction(null, fd, userId);

    expect(result.ok).toBe(true);

    // Verificar que se creó el empleado
    const empleado = await prisma.empleado.findUnique({
      where: { dni: "99999999Z" },
    });
    expect(empleado).not.toBeNull();
    expect(empleado?.esVoluntario).toBe(false);
    expect(empleado?.activo).toBe(true);
    expect(empleado?.nombre).toBe("Nuevo");
  });

  // ────────────────────────────────────────────────
  // Test 3: Rechazar solicitud con motivo
  // ────────────────────────────────────────────────
  it("rechaza la solicitud y guarda el motivoRechazo", async () => {
    const turno = await prisma.turno.create({
      data: {
        edicionId,
        casetaId,
        fechaInicio: new Date("2026-06-03T10:00:00Z"),
        fechaFin: new Date("2026-06-03T14:00:00Z"),
      },
    });

    const solicitud = await prisma.solicitudEmpleado.create({
      data: {
        edicionId,
        dni: "11111111B",
        nombre: "Rechazado",
        estado: "pendiente",
        turnos: { create: [{ turnoId: turno.id }] },
      },
    });

    const fd = buildFormData({
      solicitudId: solicitud.id,
      aprobar: false,
      motivoRechazo: "No hay plazas disponibles para este perfil.",
    });
    const result = await aprobarSolicitudEmpleadoAction(null, fd, userId);

    expect(result.ok).toBe(true);

    const solActualizada = await prisma.solicitudEmpleado.findUnique({
      where: { id: solicitud.id },
    });
    expect(solActualizada?.estado).toBe("rechazada");
    expect(solActualizada?.motivoRechazo).toBe(
      "No hay plazas disponibles para este perfil."
    );
    expect(solActualizada?.decididaAt).not.toBeNull();
    expect(solActualizada?.decididaPorUserId).toBe(userId);
  });

  // ────────────────────────────────────────────────
  // Test 4: Rechazar si el turno no tiene huecos
  // ────────────────────────────────────────────────
  it("falla si el turno no tiene huecos disponibles (plaza llena)", async () => {
    // Crear turno con plaza de capacidad 1
    const turno = await prisma.turno.create({
      data: {
        edicionId,
        casetaId,
        fechaInicio: new Date("2026-06-04T10:00:00Z"),
        fechaFin: new Date("2026-06-04T14:00:00Z"),
        plazas: { create: [{ tipoEmpleadoId, cantidad: 1 }] },
      },
    });

    // Asignar ya un empleado (ocupa la única plaza)
    const empleadoExistente = await prisma.empleado.create({
      data: {
        nombre: "Ocupado",
        dni: "22222222C",
        esVoluntario: false,
        activo: true,
        tipos: { create: [{ tipoEmpleadoId }] },
      },
    });
    await prisma.turnoEmpleado.create({
      data: {
        turnoId: turno.id,
        empleadoId: empleadoExistente.id,
        tipoImputadoId: tipoEmpleadoId,
      },
    });

    // Crear solicitud para el mismo turno (ya sin huecos)
    const solicitud = await prisma.solicitudEmpleado.create({
      data: {
        edicionId,
        dni: "33333333D",
        nombre: "SinHueco",
        estado: "pendiente",
        turnos: { create: [{ turnoId: turno.id }] },
      },
    });

    const fd = buildFormData({ solicitudId: solicitud.id, aprobar: true });
    const result = await aprobarSolicitudEmpleadoAction(null, fd, userId);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/hueco/i);
  });

  // ────────────────────────────────────────────────
  // Test 5: Rechazar si el empleado es voluntario
  // ────────────────────────────────────────────────
  it("falla si el empleado encontrado por DNI es voluntario (no se puede convertir)", async () => {
    const turno = await prisma.turno.create({
      data: {
        edicionId,
        casetaId,
        fechaInicio: new Date("2026-06-05T10:00:00Z"),
        fechaFin: new Date("2026-06-05T14:00:00Z"),
        plazas: { create: [{ tipoEmpleadoId, cantidad: 2 }] },
      },
    });

    // Crear empleado VOLUNTARIO con ese DNI
    const tipoVoluntario = await prisma.tipoEmpleado.findFirst({
      where: { esVoluntario: true, activo: true },
      select: { id: true },
    });
    if (!tipoVoluntario) {
      console.warn("No hay TipoEmpleado voluntario en BD — saltando test");
      return;
    }

    await prisma.empleado.create({
      data: {
        nombre: "Voluntario",
        dni: "44444444E",
        esVoluntario: true,
        activo: true,
        tipos: { create: [{ tipoEmpleadoId: tipoVoluntario.id }] },
      },
    });

    const solicitud = await prisma.solicitudEmpleado.create({
      data: {
        edicionId,
        dni: "44444444E",
        nombre: "Voluntario",
        estado: "pendiente",
        turnos: { create: [{ turnoId: turno.id }] },
      },
    });

    const fd = buildFormData({ solicitudId: solicitud.id, aprobar: true });
    const result = await aprobarSolicitudEmpleadoAction(null, fd, userId);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/voluntario/i);
  });
});
