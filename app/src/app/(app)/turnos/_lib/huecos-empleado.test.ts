import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { calcularHuecosEmpleado } from "./huecos-empleado";

describe("calcularHuecosEmpleado", () => {
  let edicionId: string;
  let turnoId: string;
  let tipoEmpleadoId: string;

  // Helper: chequea si tabla existe
  const tableExists = async () => {
    try {
      await prisma.$executeRaw`SELECT 1 FROM "SolicitudEmpleado" LIMIT 1`;
      return true;
    } catch {
      return false;
    }
  };

  beforeEach(async () => {
    // Seed: crear edición, turno, tipo empleado, plaza
    // Usar año único para evitar conflictos de constraint
    const anio = 2000 + Math.floor(Math.random() * 100);
    const edicion = await prisma.edicion.upsert({
      where: { anio },
      create: {
        anio,
        nombre: `Test-${Date.now()}`,
        fechaInicio: new Date(),
        fechaFin: new Date(),
        activa: true
      },
      update: {
        nombre: `Test-${Date.now()}`,
      },
    });
    edicionId = edicion.id;

    const caseta = await prisma.caseta.create({
      data: { nombre: `TestCaseta-${Date.now()}` },
    });

    const turno = await prisma.turno.create({
      data: {
        edicionId,
        casetaId: caseta.id,
        fechaInicio: new Date("2026-06-01T10:00:00Z"),
        fechaFin: new Date("2026-06-01T14:00:00Z"),
      },
    });
    turnoId = turno.id;

    const tipoEmpleado = await prisma.tipoEmpleado.findFirst({
      where: { slug: "contratado", esVoluntario: false },
    });
    if (!tipoEmpleado) {
      throw new Error("No hay tipo empleado contratado en BD");
    }
    tipoEmpleadoId = tipoEmpleado.id;

    await prisma.turnoPlaza.create({
      data: {
        turnoId,
        tipoEmpleadoId,
        cantidad: 2, // 2 huecos para contratados
      },
    });
  });

  it("debería retornar huecos libres (plazas - asignados - pendientes)", async () => {
    const huecos = await calcularHuecosEmpleado(prisma, edicionId);
    expect(huecos.get(turnoId)).toBe(2); // 2 - 0 - 0
  });

  it("debería descontar asignaciones existentes", async () => {
    // Crear empleado y asignación
    const empleado = await prisma.empleado.create({
      data: { nombre: "Test", esVoluntario: false, activo: true },
    });
    await prisma.turnoEmpleado.create({
      data: {
        turnoId,
        empleadoId: empleado.id,
        tipoImputadoId: tipoEmpleadoId,
      },
    });

    const huecos = await calcularHuecosEmpleado(prisma, edicionId);
    expect(huecos.get(turnoId)).toBe(1); // 2 - 1 - 0
  });

  it("debería descontar solicitudes empleado pendientes", async () => {
    // Skip si tabla no existe
    if (!(await tableExists())) {
      console.warn("Saltando test: tabla SolicitudEmpleado no existe");
      return;
    }
    // Crear solicitud empleado
    const solicitud = await prisma.solicitudEmpleado.create({
      data: {
        edicionId,
        dni: "12345678X",
        nombre: "Test",
        estado: "pendiente",
      },
    });
    await prisma.solicitudEmpleadoTurno.create({
      data: {
        solicitudId: solicitud.id,
        turnoId,
      },
    });

    const huecos = await calcularHuecosEmpleado(prisma, edicionId);
    expect(huecos.get(turnoId)).toBe(1); // 2 - 0 - 1
  });

  it("debería permitir excluir una solicitud (para aprobaciones)", async () => {
    // Skip si tabla no existe
    if (!(await tableExists())) {
      console.warn("Saltando test: tabla SolicitudEmpleado no existe");
      return;
    }
    const solicitud = await prisma.solicitudEmpleado.create({
      data: {
        edicionId,
        dni: "12345678X",
        nombre: "Test",
        estado: "pendiente",
      },
    });
    await prisma.solicitudEmpleadoTurno.create({
      data: {
        solicitudId: solicitud.id,
        turnoId,
      },
    });

    const huecos = await calcularHuecosEmpleado(prisma, edicionId, {
      excluirSolicitudId: solicitud.id,
    });
    expect(huecos.get(turnoId)).toBe(2); // 2 - 0 - 0 (solicitud excluida)
  });
});
