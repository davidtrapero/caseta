import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { calcularNominasAction } from "./actions";
import { prisma } from "@/lib/prisma";
import { resetAndSeed } from "@/test/integration-helpers";
import { crearEmpleado, crearTurno } from "@/test/fixtures";
import { signInAs } from "@/test/auth-helper";
import type { MinimalSeed } from "@/test/fixtures";

function iso(day: number, hour: number): Date {
  return new Date(Date.UTC(2026, 4, day, hour, 0, 0));
}

/**
 * Crea un turno ya con asignaciones en estado asistio=true.
 * Simula un empleado que trabajó N días.
 */
async function crearTurnosConAsistencia(params: {
  edicionId: string;
  casetaId: string;
  empleadoId: string;
  dias: number[];
}) {
  for (const d of params.dias) {
    const turno = await crearTurno({
      edicionId: params.edicionId,
      casetaId: params.casetaId,
      fechaInicio: iso(d, 12),
      fechaFin: iso(d, 18),
      empleadoIds: [params.empleadoId],
    });
    await prisma.turnoEmpleado.updateMany({
      where: { turnoId: turno.id, empleadoId: params.empleadoId },
      data: { asistio: true },
    });
  }
}

describe("calcularNominasAction", () => {
  let seed: MinimalSeed;

  beforeEach(async () => {
    seed = await resetAndSeed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("admin calcula nómina simple: dias × jornal", async () => {
    await signInAs("admin");
    const emp = await crearEmpleado({
      nombre: "Ana",
      dni: "11111111A",
      jornalDiario: 80,
    });
    await crearTurnosConAsistencia({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      empleadoId: emp.id,
      dias: [2, 3, 4],
    });

    const res = await calcularNominasAction();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.creadas).toBe(1);

    const nomina = await prisma.nomina.findFirstOrThrow({
      where: { empleadoId: emp.id },
    });
    expect(nomina.diasTrabajados).toBe(3);
    expect(Number(nomina.total)).toBe(240);
  });

  it("voluntarios (jornalDiario null) quedan excluidos", async () => {
    await signInAs("admin");
    const voluntario = await crearEmpleado({
      nombre: "Vol",
      dni: "22222222B",
      perfil: "voluntario",
    });
    await crearTurnosConAsistencia({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      empleadoId: voluntario.id,
      dias: [2, 3],
    });

    const res = await calcularNominasAction();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.creadas).toBe(0);
      expect(res.data.voluntariosOmitidos).toBe(1);
    }
    expect(await prisma.nomina.count()).toBe(0);
  });

  it("nóminas ya pagadas NO se sobrescriben (gerente)", async () => {
    await signInAs("gerente");
    const emp = await crearEmpleado({
      nombre: "Ana",
      dni: "11111111A",
      jornalDiario: 80,
    });
    await crearTurnosConAsistencia({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      empleadoId: emp.id,
      dias: [2, 3],
    });
    // Primer cálculo → pagarla.
    await calcularNominasAction();
    await prisma.nomina.updateMany({
      where: { empleadoId: emp.id },
      data: { pagada: true },
    });

    // Añadir otro día de asistencia.
    await crearTurnosConAsistencia({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      empleadoId: emp.id,
      dias: [5],
    });

    // Gerente no puede recalcular si hay pagadas.
    const res = await calcularNominasAction();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/pagadas/i);
  });

  it("admin sí puede recalcular aunque haya pagadas, y omite las pagadas", async () => {
    await signInAs("admin");
    const [a, b] = await Promise.all([
      crearEmpleado({ nombre: "Ana", dni: "11111111A", jornalDiario: 80 }),
      crearEmpleado({ nombre: "Ben", dni: "22222222B", jornalDiario: 70 }),
    ]);
    await crearTurnosConAsistencia({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      empleadoId: a.id,
      dias: [2, 3],
    });
    await crearTurnosConAsistencia({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      empleadoId: b.id,
      dias: [2],
    });

    // Primer cálculo.
    await calcularNominasAction();
    // Ana cobra.
    await prisma.nomina.updateMany({
      where: { empleadoId: a.id },
      data: { pagada: true },
    });

    // Ben trabaja otro día.
    await crearTurnosConAsistencia({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      empleadoId: b.id,
      dias: [3, 4],
    });

    const res = await calcularNominasAction();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.pagadasOmitidas).toBe(1); // Ana
      expect(res.data.actualizadas).toBe(1); // Ben recalculado
    }
    // Ana sigue con 2 días (no se tocó).
    const nominaAna = await prisma.nomina.findFirstOrThrow({
      where: { empleadoId: a.id },
    });
    expect(nominaAna.diasTrabajados).toBe(2);
    expect(nominaAna.pagada).toBe(true);
    // Ben ahora tiene 3 días.
    const nominaBen = await prisma.nomina.findFirstOrThrow({
      where: { empleadoId: b.id },
    });
    expect(nominaBen.diasTrabajados).toBe(3);
  });

  it("sin edición activa → error", async () => {
    await signInAs("admin");
    await prisma.edicion.update({
      where: { id: seed.edicion.id },
      data: { activa: false },
    });
    const res = await calcularNominasAction();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/edición activa/i);
  });

  it("cajero no puede calcular → forbidden", async () => {
    await signInAs("cajero");
    const res = await calcularNominasAction();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/permiso/i);
  });

  it("solo cuenta asistencias con asistio=true", async () => {
    await signInAs("admin");
    const emp = await crearEmpleado({
      nombre: "Ana",
      dni: "11111111A",
      jornalDiario: 80,
    });
    // 2 turnos, pero no marcamos asistencia.
    await crearTurno({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      fechaInicio: iso(2, 12),
      fechaFin: iso(2, 18),
      empleadoIds: [emp.id],
    });
    await crearTurno({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      fechaInicio: iso(3, 12),
      fechaFin: iso(3, 18),
      empleadoIds: [emp.id],
    });

    const res = await calcularNominasAction();
    expect(res.ok).toBe(true);
    // Sin asistencia marcada no hay nómina.
    expect(await prisma.nomina.count()).toBe(0);
  });
});
