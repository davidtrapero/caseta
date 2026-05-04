import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { ajustarStockAction } from "./actions";
import { prisma } from "@/lib/prisma";
import { resetAndSeed, formData } from "@/test/integration-helpers";
import { crearProducto } from "@/test/fixtures";
import { signInAs } from "@/test/auth-helper";
import type { MinimalSeed } from "@/test/fixtures";

describe("ajustarStockAction", () => {
  let seed: MinimalSeed;
  let productoId: string;

  beforeEach(async () => {
    seed = await resetAndSeed();
    const prod = await crearProducto({
      casetaId: seed.caseta.id,
      nombre: "Cerveza",
      unidad: "botella",
    });
    productoId = prod.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("admin ajusta stock inicial (no existe Stock previo) → crea fila y movimiento", async () => {
    await signInAs("admin");
    const res = await ajustarStockAction(
      null,
      formData({
        casetaId: seed.caseta.id,
        productoId,
        nuevaCantidad: 50,
        nota: "Inventario inicial",
      })
    );
    expect(res.ok).toBe(true);

    const stock = await prisma.stock.findUniqueOrThrow({
      where: {
        casetaId_productoId: { casetaId: seed.caseta.id, productoId },
      },
    });
    expect(Number(stock.cantidad)).toBe(50);

    // Movimiento con diferencia = 50 - 0 = +50.
    const movs = await prisma.movimientoStock.findMany({
      where: { productoId },
    });
    expect(movs).toHaveLength(1);
    expect(movs[0].tipo).toBe("ajuste");
    expect(Number(movs[0].cantidad)).toBe(50);
  });

  it("diferencia = 0 → no crea movimiento", async () => {
    await signInAs("admin");
    // Set inicial a 30.
    await ajustarStockAction(
      null,
      formData({ casetaId: seed.caseta.id, productoId, nuevaCantidad: 30 })
    );
    const movsPrev = await prisma.movimientoStock.count();
    expect(movsPrev).toBe(1);

    // Ajustar a 30 otra vez → diferencia 0.
    const res = await ajustarStockAction(
      null,
      formData({ casetaId: seed.caseta.id, productoId, nuevaCantidad: 30 })
    );
    expect(res.ok).toBe(true);
    const movsAfter = await prisma.movimientoStock.count();
    expect(movsAfter).toBe(1); // sin cambios
  });

  it("ajuste a la baja → movimiento con cantidad negativa", async () => {
    await signInAs("admin");
    await ajustarStockAction(
      null,
      formData({ casetaId: seed.caseta.id, productoId, nuevaCantidad: 100 })
    );
    const res = await ajustarStockAction(
      null,
      formData({ casetaId: seed.caseta.id, productoId, nuevaCantidad: 80 })
    );
    expect(res.ok).toBe(true);
    const movs = await prisma.movimientoStock.findMany({
      where: { productoId },
      orderBy: { fecha: "asc" },
    });
    expect(movs).toHaveLength(2);
    expect(Number(movs[1].cantidad)).toBe(-20);
    const stock = await prisma.stock.findUniqueOrThrow({
      where: {
        casetaId_productoId: { casetaId: seed.caseta.id, productoId },
      },
    });
    expect(Number(stock.cantidad)).toBe(80);
  });

  it("cajero no puede ajustar", async () => {
    await signInAs("cajero");
    const res = await ajustarStockAction(
      null,
      formData({ casetaId: seed.caseta.id, productoId, nuevaCantidad: 10 })
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/permiso/i);
  });

  it("producto de otra caseta → error", async () => {
    await signInAs("admin");
    // Crear otra caseta + producto allí.
    const otraCaseta = await prisma.caseta.create({
      data: { nombre: "Otra Caseta", activa: true },
    });
    const res = await ajustarStockAction(
      null,
      formData({ casetaId: otraCaseta.id, productoId, nuevaCantidad: 10 })
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/no pertenece/i);
  });
});
