import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Dashboard KPIs — agregar por edición", () => {
  let edicionId: string;
  let casetaId: string;
  let usuarioId: string;
  let tipoEmpleado1Id: string;
  let tipoEmpleado2Id: string;

  beforeEach(async () => {
    // Crear usuario (requerido por Gasto)
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        name: "Test User",
      },
    });
    usuarioId = user.id;

    // Crear 2 tipos de empleado (para plazas distintas)
    const tipo1 = await prisma.tipoEmpleado.create({
      data: {
        slug: `test-tipo-1-${Date.now()}`,
        label: "Tipo 1",
        labelCorto: "T1",
        colorHex: "#FF0000",
      },
    });
    tipoEmpleado1Id = tipo1.id;

    const tipo2 = await prisma.tipoEmpleado.create({
      data: {
        slug: `test-tipo-2-${Date.now()}`,
        label: "Tipo 2",
        labelCorto: "T2",
        colorHex: "#00FF00",
      },
    });
    tipoEmpleado2Id = tipo2.id;

    // Crear edición activa
    const edicion = await prisma.edicion.create({
      data: {
        anio: 1900 + Math.floor(Math.random() * 200),
        nombre: "Test Edición Dashboard",
        activa: true,
        fechaInicio: new Date("2026-05-01"),
        fechaFin: new Date("2026-05-31"),
      },
    });
    edicionId = edicion.id;

    // Crear caseta activa
    const caseta = await prisma.caseta.create({
      data: {
        nombre: `Caseta Test ${Date.now()}`,
        activa: true,
      },
    });
    casetaId = caseta.id;
  });

  afterEach(async () => {
    // Limpiar en orden de dependencias
    await prisma.turnoEmpleado.deleteMany({ where: { turno: { edicionId } } });
    await prisma.turnoPlaza.deleteMany({ where: { turno: { edicionId } } });
    await prisma.turno.deleteMany({ where: { edicionId } });
    await prisma.cierreDiario.deleteMany({ where: { edicionId } });
    await prisma.gasto.deleteMany({ where: { edicionId } });
    await prisma.edicion.deleteMany({ where: { id: edicionId } });
    await prisma.caseta.deleteMany({ where: { id: casetaId } });
    await prisma.tipoEmpleado.deleteMany({ where: { id: { in: [tipoEmpleado1Id, tipoEmpleado2Id] } } });
    await prisma.user.deleteMany({ where: { id: usuarioId } });
    await prisma.empleado.deleteMany({});
  });

  it("debe sumar ingresos de TODA la edición, no solo un día", async () => {
    // Crear 2 cierres en días distintos
    await prisma.cierreDiario.create({
      data: {
        edicionId,
        casetaId,
        fecha: new Date("2026-05-10"),
        ingresosTotales: 1000,
      },
    });

    await prisma.cierreDiario.create({
      data: {
        edicionId,
        casetaId,
        fecha: new Date("2026-05-11"),
        ingresosTotales: 500,
      },
    });

    // Verificar suma acumulada
    const agg = await prisma.cierreDiario.aggregate({
      where: { edicionId },
      _sum: { ingresosTotales: true },
    });

    expect(Number(agg._sum.ingresosTotales ?? 0)).toBe(1500);
  });

  it("debe calcular gastos y neto correctos para edición", async () => {
    // Crear cierre
    await prisma.cierreDiario.create({
      data: {
        edicionId,
        casetaId,
        fecha: new Date("2026-05-10"),
        ingresosTotales: 1500,
      },
    });

    // Crear 2 gastos
    await prisma.gasto.create({
      data: {
        edicionId,
        descripcion: "Gasto 1",
        monto: 200,
        categoria: "operativo",
        fecha: new Date("2026-05-15"),
        usuarioId,
      },
    });

    await prisma.gasto.create({
      data: {
        edicionId,
        descripcion: "Gasto 2",
        monto: 150,
        categoria: "mantenimiento",
        fecha: new Date("2026-05-16"),
        usuarioId,
      },
    });

    // Verificar
    const ingresoAgg = await prisma.cierreDiario.aggregate({
      where: { edicionId },
      _sum: { ingresosTotales: true },
    });

    const gastoAgg = await prisma.gasto.aggregate({
      where: { edicionId },
      _sum: { monto: true },
    });

    const ingresos = Number(ingresoAgg._sum.ingresosTotales ?? 0);
    const gastos = Number(gastoAgg._sum.monto ?? 0);
    const neto = ingresos - gastos;

    expect(ingresos).toBe(1500);
    expect(gastos).toBe(350);
    expect(neto).toBe(1150);
  });

  it("debe retornar 0 cuando no hay cierres ni gastos", async () => {
    const ingresoAgg = await prisma.cierreDiario.aggregate({
      where: { edicionId },
      _sum: { ingresosTotales: true },
    });

    const gastoAgg = await prisma.gasto.aggregate({
      where: { edicionId },
      _sum: { monto: true },
    });

    expect(Number(ingresoAgg._sum.ingresosTotales ?? 0)).toBe(0);
    expect(Number(gastoAgg._sum.monto ?? 0)).toBe(0);
  });

  it("debe agregar plazas por tipo de empleado en turno", async () => {
    // Crear turno
    const turno = await prisma.turno.create({
      data: {
        edicionId,
        casetaId,
        fechaInicio: new Date("2026-05-20T10:00:00Z"),
        fechaFin: new Date("2026-05-20T14:00:00Z"),
      },
    });

    // Crear 2 plazas distintas (tipos diferentes)
    await prisma.turnoPlaza.create({
      data: {
        turnoId: turno.id,
        tipoEmpleadoId: tipoEmpleado1Id,
        cantidad: 2,
      },
    });

    await prisma.turnoPlaza.create({
      data: {
        turnoId: turno.id,
        tipoEmpleadoId: tipoEmpleado2Id,
        cantidad: 3,
      },
    });

    // Verificar suma de plazas
    const plazasExp = await prisma.turnoPlaza.aggregate({
      _sum: { cantidad: true },
      where: { turno: { edicionId } },
    });

    expect(Number(plazasExp._sum.cantidad ?? 0)).toBe(5);
  });

  it("debe contar asignaciones de empleados en turnos", async () => {
    // Crear turno
    const turno = await prisma.turno.create({
      data: {
        edicionId,
        casetaId,
        fechaInicio: new Date("2026-05-20T10:00:00Z"),
        fechaFin: new Date("2026-05-20T14:00:00Z"),
      },
    });

    // Crear 2 empleados
    const emp1 = await prisma.empleado.create({
      data: {
        nombre: "Juan Test",
        dni: `DNI1-${Date.now()}`,
        telefono: "666666666",
      },
    });

    const emp2 = await prisma.empleado.create({
      data: {
        nombre: "Pedro Test",
        dni: `DNI2-${Date.now()}`,
        telefono: "777777777",
      },
    });

    // Crear 2 asignaciones
    await prisma.turnoEmpleado.create({
      data: {
        turnoId: turno.id,
        empleadoId: emp1.id,
        tipoImputadoId: tipoEmpleado1Id,
      },
    });

    await prisma.turnoEmpleado.create({
      data: {
        turnoId: turno.id,
        empleadoId: emp2.id,
        tipoImputadoId: tipoEmpleado2Id,
      },
    });

    // Verificar count
    const plazasOcp = await prisma.turnoEmpleado.count({
      where: { turno: { edicionId } },
    });

    expect(plazasOcp).toBe(2);
  });
});
