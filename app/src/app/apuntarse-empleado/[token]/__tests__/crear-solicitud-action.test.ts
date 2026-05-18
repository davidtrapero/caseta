import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { crearSolicitudEmpleadoAction } from "../actions";

// Helper para construir un FormData de solicitud válida
function buildFormData(overrides?: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  const defaults: Record<string, string | string[]> = {
    dni: "12345678A",
    nombre: "Ana García",
    email: "ana@example.com",
  };
  const merged = { ...defaults, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.append(key, value);
    }
  }
  return fd;
}

describe("crearSolicitudEmpleadoAction", () => {
  let edicionId: string;
  let turno1Id: string;
  let turno2Id: string;
  let formularioToken: string;

  beforeEach(async () => {
    formularioToken = `token-test-${Date.now()}-${"x".repeat(20)}`;

    // Anio único basado en el timestamp en ms para evitar conflictos de constraint
    // (anio está como Int en Prisma, usamos timestamp mod para que quepa en un rango razonable)
    // Range: 10000-19999 (reservado para tests)
    const anio = 10000 + (Date.now() % 9999);

    // Cleanup previo por si quedó basura de un test anterior con el mismo anio
    const existing = await prisma.edicion.findUnique({ where: { anio } });
    if (existing) {
      await prisma.turnoPlaza.deleteMany({ where: { turno: { edicionId: existing.id } } });
      await prisma.turnoEmpleado.deleteMany({ where: { turno: { edicionId: existing.id } } });
      await prisma.turno.deleteMany({ where: { edicionId: existing.id } });
      await prisma.edicion.delete({ where: { id: existing.id } });
    }

    const edicion = await prisma.edicion.create({
      data: {
        anio,
        nombre: `Test-Crear-${Date.now()}`,
        fechaInicio: new Date("2026-06-01"),
        fechaFin: new Date("2026-06-10"),
        activa: true,
        formularioToken,
      },
    });
    edicionId = edicion.id;

    const caseta = await prisma.caseta.create({
      data: { nombre: `TestCasetaCrear-${Date.now()}` },
    });

    const tipoEmpleado = await prisma.tipoEmpleado.findFirst({
      where: { esVoluntario: false },
    });
    if (!tipoEmpleado) throw new Error("No hay tipoEmpleado contratado en BD");

    const turno1 = await prisma.turno.create({
      data: {
        edicionId,
        casetaId: caseta.id,
        fechaInicio: new Date("2026-06-01T10:00:00Z"),
        fechaFin: new Date("2026-06-01T14:00:00Z"),
      },
    });
    turno1Id = turno1.id;

    const turno2 = await prisma.turno.create({
      data: {
        edicionId,
        casetaId: caseta.id,
        fechaInicio: new Date("2026-06-01T16:00:00Z"),
        fechaFin: new Date("2026-06-01T20:00:00Z"),
      },
    });
    turno2Id = turno2.id;

    // Crear plazas: 2 huecos por turno
    await prisma.turnoPlaza.createMany({
      data: [
        { turnoId: turno1Id, tipoEmpleadoId: tipoEmpleado.id, cantidad: 2 },
        { turnoId: turno2Id, tipoEmpleadoId: tipoEmpleado.id, cantidad: 2 },
      ],
    });
  });

  afterEach(async () => {
    // Limpiar en orden de dependencias. Usar try/catch por si alguna tabla no existe aún.
    try {
      await prisma.solicitudEmpleadoTurno.deleteMany({
        where: { turno: { edicionId } },
      });
    } catch {
      // tabla puede no existir en BD de test
    }
    try {
      await prisma.solicitudEmpleado.deleteMany({ where: { edicionId } });
    } catch {
      // ídem
    }
    await prisma.turnoPlaza.deleteMany({ where: { turno: { edicionId } } });
    await prisma.turnoEmpleado.deleteMany({ where: { turno: { edicionId } } });
    await prisma.turno.deleteMany({ where: { edicionId } });
    await prisma.edicion.delete({ where: { id: edicionId } });
  });

  // Test 1: Crear solicitud con turnos válidos
  it("debería crear solicitud correctamente con turnos válidos", async () => {
    const fd = buildFormData({ turnoIds: [turno1Id, turno2Id] });
    fd.append("_token", formularioToken);

    const result = await crearSolicitudEmpleadoAction(null, fd);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    expect(result.data.id).toBeTruthy();

    // Verificar que la solicitud existe en BD con sus turnos
    const solicitud = await prisma.solicitudEmpleado.findUnique({
      where: { id: result.data.id },
      include: { turnos: true },
    });
    expect(solicitud).not.toBeNull();
    expect(solicitud!.estado).toBe("pendiente");
    expect(solicitud!.turnos).toHaveLength(2);
  });

  // Test 2: Rechazar si edicion inactiva
  it("debería rechazar si la edición está inactiva", async () => {
    // Desactivar la edición
    await prisma.edicion.update({
      where: { id: edicionId },
      data: { activa: false },
    });

    const fd = buildFormData({ turnoIds: [turno1Id] });
    fd.append("_token", formularioToken);

    const result = await crearSolicitudEmpleadoAction(null, fd);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error");
    expect(result.error).toMatch(/no.*activa|inactiva|cerrada|activo/i);
  });

  // Test 3: Rechazar si no hay huecos disponibles
  it("debería rechazar si el turno está lleno", async () => {
    // Llenar turno1 creando 2 asignaciones (cantidad=2)
    const tipoEmpleado = await prisma.tipoEmpleado.findFirst({
      where: { esVoluntario: false },
    });
    const emp1 = await prisma.empleado.create({
      data: { nombre: "Emp1Fill", esVoluntario: false, activo: true },
    });
    const emp2 = await prisma.empleado.create({
      data: { nombre: "Emp2Fill", esVoluntario: false, activo: true },
    });
    await prisma.turnoEmpleado.createMany({
      data: [
        { turnoId: turno1Id, empleadoId: emp1.id, tipoImputadoId: tipoEmpleado!.id },
        { turnoId: turno1Id, empleadoId: emp2.id, tipoImputadoId: tipoEmpleado!.id },
      ],
    });

    const fd = buildFormData({ turnoIds: [turno1Id] });
    fd.append("_token", formularioToken);

    const result = await crearSolicitudEmpleadoAction(null, fd);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error");
    expect(result.fieldErrors?.turnoIds ?? result.error).toBeTruthy();

    // Cleanup
    await prisma.turnoEmpleado.deleteMany({
      where: { empleadoId: { in: [emp1.id, emp2.id] } },
    });
    await prisma.empleado.deleteMany({ where: { id: { in: [emp1.id, emp2.id] } } });
  });

  // Test 4: Rechazar si los turnos se solapan entre sí
  it("debería rechazar si los turnos de la solicitud se solapan", async () => {
    // Crear un tercer turno que solape con turno1 (10:00-14:00 → mismo rango)
    const caseta = await prisma.caseta.findFirst({ where: { nombre: { startsWith: "TestCasetaCrear-" } } });
    const turnoSolape = await prisma.turno.create({
      data: {
        edicionId,
        casetaId: caseta!.id,
        fechaInicio: new Date("2026-06-01T12:00:00Z"), // solapa con turno1 (10-14)
        fechaFin: new Date("2026-06-01T15:00:00Z"),
      },
    });
    const tipoEmpleado = await prisma.tipoEmpleado.findFirst({ where: { esVoluntario: false } });
    await prisma.turnoPlaza.create({
      data: { turnoId: turnoSolape.id, tipoEmpleadoId: tipoEmpleado!.id, cantidad: 2 },
    });

    const fd = buildFormData({ turnoIds: [turno1Id, turnoSolape.id] });
    fd.append("_token", formularioToken);

    const result = await crearSolicitudEmpleadoAction(null, fd);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error");
    // fieldErrors.turnoIds o error genérico
    const errorMsg = result.fieldErrors?.turnoIds?.[0] ?? result.error;
    expect(errorMsg).toMatch(/solap/i);

    // Cleanup extra turno
    await prisma.turnoPlaza.deleteMany({ where: { turnoId: turnoSolape.id } });
    await prisma.turno.delete({ where: { id: turnoSolape.id } });
  });

  // Test 5: Preservar values en error para recuperación del formulario
  it("debería preservar values en el resultado de error", async () => {
    // Edición inactiva → error esperado
    await prisma.edicion.update({ where: { id: edicionId }, data: { activa: false } });

    const fd = buildFormData({ turnoIds: [turno1Id] });
    fd.append("_token", formularioToken);

    const result = await crearSolicitudEmpleadoAction(null, fd);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error");
    // values debe estar presente y contener los campos del formulario
    expect(result.values).toBeDefined();
    expect(result.values?.dni).toBe("12345678A");
    expect(result.values?.nombre).toBe("Ana García");
    // token debe estar excluido de values (blacklist)
    expect(result.values?.token).toBeUndefined();
    expect(result.values?._token).toBeUndefined();
  });

  // Test 6: Rate-limit 10/min
  it("debería rechazar al superar 10 peticiones por minuto", async () => {
    // El rate-limit es in-memory por IP. En tests la IP es "unknown".
    // Hacer 11 llamadas: las primeras 10 pueden ok (o error por otros motivos),
    // la 11ª debe ser rechazada por rate-limit.
    const results: Array<Awaited<ReturnType<typeof crearSolicitudEmpleadoAction>>> = [];

    // Usamos un token inválido (< 20 chars) para que fallen rápido sin tocar BD,
    // así no interferimos con el seed. El rate-limit se verifica antes del token.
    // PERO en la spec el rate-limit va DESPUÉS de la validación del token.
    // Usar token válido pero DNI duplicado (segunda solicitud con mismo DNI+edicion falla por unique).
    // Para simplificar, usamos token con edición activa y DNI único cada vez — pero
    // el bucket "apuntarse-empleado-crear" bloquea al 11º intento desde la misma IP ("unknown").

    // Llamadas 1-10: puede que alguna falle (turno lleno, etc.) pero no por rate-limit
    for (let i = 0; i < 10; i++) {
      const fd = buildFormData({
        dni: `TEST${String(i).padStart(8, "0")}`,
        turnoIds: [turno1Id],
      });
      fd.append("_token", formularioToken);
      results.push(await crearSolicitudEmpleadoAction(null, fd));
    }

    // Llamada 11: debe ser rechazada por rate-limit
    const fd11 = buildFormData({ dni: "RATELIMIT99", turnoIds: [turno1Id] });
    fd11.append("_token", formularioToken);
    const result11 = await crearSolicitudEmpleadoAction(null, fd11);

    expect(result11.ok).toBe(false);
    if (result11.ok) throw new Error("Expected rate-limit error");
    expect(result11.error).toMatch(/límite|rate|intento|demasiadas/i);
  });
});
