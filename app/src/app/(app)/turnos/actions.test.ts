import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  crearTurnoAction,
  asignarEmpleadoAction,
  desasignarEmpleadoAction,
} from "./actions";
import { prisma } from "@/lib/prisma";
import { resetAndSeed, formData } from "@/test/integration-helpers";
import { crearEmpleado, crearTurno } from "@/test/fixtures";
import { signInAs, clearTestCookie } from "@/test/auth-helper";
import type { MinimalSeed } from "@/test/fixtures";

// ISO con minuto 0 UTC (el schema lo exige).
function iso(day: number, hour: number): string {
  return new Date(Date.UTC(2026, 4, day, hour, 0, 0)).toISOString();
}

describe("crearTurnoAction", () => {
  let seed: MinimalSeed;

  beforeEach(async () => {
    seed = await resetAndSeed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("admin puede crear turno vacío", async () => {
    await signInAs("admin");
    const res = await crearTurnoAction(
      null,
      formData({
        edicionId: seed.edicion.id,
        casetaId: seed.caseta.id,
        fechaInicio: iso(2, 12),
        fechaFin: iso(2, 18),
        empleadoIdsJson: "[]",
        plazasJson: "[]",
      })
    );
    expect(res.ok).toBe(true);
    const cnt = await prisma.turno.count();
    expect(cnt).toBe(1);
  });

  it("cajero no puede crear turno → forbidden", async () => {
    await signInAs("cajero");
    const res = await crearTurnoAction(
      null,
      formData({
        edicionId: seed.edicion.id,
        casetaId: seed.caseta.id,
        fechaInicio: iso(2, 12),
        fechaFin: iso(2, 18),
        empleadoIdsJson: "[]",
        plazasJson: "[]",
      })
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/permiso/i);
  });

  it("sin sesión → unauthenticated", async () => {
    clearTestCookie();
    const res = await crearTurnoAction(
      null,
      formData({
        edicionId: seed.edicion.id,
        casetaId: seed.caseta.id,
        fechaInicio: iso(2, 12),
        fechaFin: iso(2, 18),
        empleadoIdsJson: "[]",
        plazasJson: "[]",
      })
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/no autenticado/i);
  });

  it("Zod falla sin fechaInicio → fieldErrors", async () => {
    await signInAs("admin");
    const res = await crearTurnoAction(
      null,
      formData({
        edicionId: seed.edicion.id,
        casetaId: seed.caseta.id,
        fechaFin: iso(2, 18),
        empleadoIdsJson: "[]",
        plazasJson: "[]",
      })
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors).toBeDefined();
  });

  it("empleado duplicado en lista → error", async () => {
    await signInAs("admin");
    const emp = await crearEmpleado({ nombre: "Ana", dni: "11111111A" });
    const res = await crearTurnoAction(
      null,
      formData({
        edicionId: seed.edicion.id,
        casetaId: seed.caseta.id,
        fechaInicio: iso(2, 12),
        fechaFin: iso(2, 18),
        empleadoIdsJson: JSON.stringify([emp.id, emp.id]),
        plazasJson: "[]",
      })
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/duplicado/i);
  });

  it("asigna varios empleados en la misma creación", async () => {
    await signInAs("admin");
    const [a, b] = await Promise.all([
      crearEmpleado({ nombre: "Ana", dni: "11111111A" }),
      crearEmpleado({ nombre: "Ben", dni: "22222222B" }),
    ]);
    const res = await crearTurnoAction(
      null,
      formData({
        edicionId: seed.edicion.id,
        casetaId: seed.caseta.id,
        fechaInicio: iso(2, 12),
        fechaFin: iso(2, 18),
        empleadoIdsJson: JSON.stringify([a.id, b.id]),
        plazasJson: "[]",
      })
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      const asignaciones = await prisma.turnoEmpleado.findMany({
        where: { turnoId: res.data.id },
      });
      expect(asignaciones).toHaveLength(2);
    }
  });

  it("detecta solape con turno existente del mismo empleado", async () => {
    await signInAs("admin");
    const emp = await crearEmpleado({ nombre: "Ana", dni: "11111111A" });
    await crearTurno({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      fechaInicio: new Date(iso(2, 10)),
      fechaFin: new Date(iso(2, 14)),
      empleadoIds: [emp.id],
    });
    const res = await crearTurnoAction(
      null,
      formData({
        edicionId: seed.edicion.id,
        casetaId: seed.caseta.id,
        fechaInicio: iso(2, 12),
        fechaFin: iso(2, 18),
        empleadoIdsJson: JSON.stringify([emp.id]),
        plazasJson: "[]",
      })
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/solape/i);
  });
});

describe("asignar/desasignar empleado", () => {
  let seed: MinimalSeed;
  let empleadoId: string;
  let turnoId: string;
  let tipoImputadoId: string;

  beforeEach(async () => {
    seed = await resetAndSeed();
    await signInAs("admin");
    const emp = await crearEmpleado({ nombre: "Ana", dni: "11111111A" });
    const turno = await crearTurno({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      fechaInicio: new Date(iso(2, 12)),
      fechaFin: new Date(iso(2, 18)),
    });
    empleadoId = emp.id;
    turnoId = turno.id;
    // Resolver tipoImputadoId desde EmpleadoTipo (primer tipo del empleado).
    const et = await prisma.empleadoTipo.findFirst({
      where: { empleadoId: emp.id },
      orderBy: { createdAt: "asc" },
      select: { tipoEmpleadoId: true },
    });
    if (!et) throw new Error("Empleado sin tipo asignado en test");
    tipoImputadoId = et.tipoEmpleadoId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("asigna y luego desasigna", async () => {
    const r1 = await asignarEmpleadoAction(
      null,
      formData({ turnoId, empleadoId, tipoImputadoId })
    );
    expect(r1.ok).toBe(true);
    expect(await prisma.turnoEmpleado.count()).toBe(1);

    const r2 = await desasignarEmpleadoAction(
      null,
      formData({ turnoId, empleadoId })
    );
    expect(r2.ok).toBe(true);
    expect(await prisma.turnoEmpleado.count()).toBe(0);
  });

  it("asignar dos veces el mismo empleado → error", async () => {
    await asignarEmpleadoAction(null, formData({ turnoId, empleadoId, tipoImputadoId }));
    const r2 = await asignarEmpleadoAction(
      null,
      formData({ turnoId, empleadoId, tipoImputadoId })
    );
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toMatch(/ya está asignado/i);
  });
});
