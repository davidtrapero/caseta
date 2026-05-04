import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { recibirPedidoAction, cancelarPedidoAction } from "./actions";
import { prisma } from "@/lib/prisma";
import { resetAndSeed, formData } from "@/test/integration-helpers";
import { crearProducto } from "@/test/fixtures";
import { signInAs } from "@/test/auth-helper";
import type { MinimalSeed } from "@/test/fixtures";

async function crearPedidoPendiente(params: {
  edicionId: string;
  casetaId: string;
  proveedorId: string;
  lineas: { productoId: string; cantidad: number; precioUnitario: number }[];
}) {
  const total = params.lineas.reduce(
    (a, l) => a + l.cantidad * l.precioUnitario,
    0
  );
  return prisma.pedido.create({
    data: {
      edicionId: params.edicionId,
      casetaId: params.casetaId,
      proveedorId: params.proveedorId,
      total,
      estado: "pendiente",
      detalles: { create: params.lineas },
    },
    include: { detalles: true },
  });
}

describe("recibirPedidoAction", () => {
  let seed: MinimalSeed;
  let prodA: string;
  let prodB: string;

  beforeEach(async () => {
    seed = await resetAndSeed();
    const [a, b] = await Promise.all([
      crearProducto({
        casetaId: seed.caseta.id,
        nombre: "Cerveza",
        unidad: "botella",
      }),
      crearProducto({
        casetaId: seed.caseta.id,
        nombre: "Hielo",
        unidad: "kg",
      }),
    ]);
    prodA = a.id;
    prodB = b.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("recibe pedido: crea N movimientos entrada + upsert stock + marca recibido", async () => {
    await signInAs("admin");
    const pedido = await crearPedidoPendiente({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      proveedorId: seed.proveedor.id,
      lineas: [
        { productoId: prodA, cantidad: 100, precioUnitario: 1.5 },
        { productoId: prodB, cantidad: 50, precioUnitario: 2.0 },
      ],
    });

    const res = await recibirPedidoAction(null, formData({ _id: pedido.id }));
    expect(res.ok).toBe(true);

    // Pedido en estado recibido + fechaRecepcion.
    const pedidoActual = await prisma.pedido.findUniqueOrThrow({
      where: { id: pedido.id },
    });
    expect(pedidoActual.estado).toBe("recibido");
    expect(pedidoActual.fechaRecepcion).not.toBeNull();

    // Dos movimientos de entrada.
    const movs = await prisma.movimientoStock.findMany({
      where: { casetaId: seed.caseta.id },
      orderBy: { productoId: "asc" },
    });
    expect(movs).toHaveLength(2);
    expect(movs.every((m) => m.tipo === "entrada")).toBe(true);

    // Stocks correctos.
    const stockA = await prisma.stock.findUniqueOrThrow({
      where: {
        casetaId_productoId: { casetaId: seed.caseta.id, productoId: prodA },
      },
    });
    expect(Number(stockA.cantidad)).toBe(100);
    const stockB = await prisma.stock.findUniqueOrThrow({
      where: {
        casetaId_productoId: { casetaId: seed.caseta.id, productoId: prodB },
      },
    });
    expect(Number(stockB.cantidad)).toBe(50);
  });

  it("recibir 2 pedidos seguidos acumula stock", async () => {
    await signInAs("admin");
    const p1 = await crearPedidoPendiente({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      proveedorId: seed.proveedor.id,
      lineas: [{ productoId: prodA, cantidad: 100, precioUnitario: 1 }],
    });
    const p2 = await crearPedidoPendiente({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      proveedorId: seed.proveedor.id,
      lineas: [{ productoId: prodA, cantidad: 50, precioUnitario: 1 }],
    });

    await recibirPedidoAction(null, formData({ _id: p1.id }));
    await recibirPedidoAction(null, formData({ _id: p2.id }));

    const stock = await prisma.stock.findUniqueOrThrow({
      where: {
        casetaId_productoId: { casetaId: seed.caseta.id, productoId: prodA },
      },
    });
    expect(Number(stock.cantidad)).toBe(150);
  });

  it("IDEMPOTENCIA: recibir dos veces el mismo pedido → segundo falla", async () => {
    await signInAs("admin");
    const pedido = await crearPedidoPendiente({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      proveedorId: seed.proveedor.id,
      lineas: [{ productoId: prodA, cantidad: 100, precioUnitario: 1.5 }],
    });
    const r1 = await recibirPedidoAction(null, formData({ _id: pedido.id }));
    expect(r1.ok).toBe(true);

    const r2 = await recibirPedidoAction(null, formData({ _id: pedido.id }));
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toMatch(/recibido/i);

    // Stock NO se duplicó.
    const stock = await prisma.stock.findUniqueOrThrow({
      where: {
        casetaId_productoId: { casetaId: seed.caseta.id, productoId: prodA },
      },
    });
    expect(Number(stock.cantidad)).toBe(100);
    // Solo un movimiento de entrada.
    const movs = await prisma.movimientoStock.count();
    expect(movs).toBe(1);
  });

  it("no se puede recibir pedido cancelado", async () => {
    await signInAs("admin");
    const pedido = await crearPedidoPendiente({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      proveedorId: seed.proveedor.id,
      lineas: [{ productoId: prodA, cantidad: 10, precioUnitario: 1 }],
    });
    await cancelarPedidoAction(null, formData({ _id: pedido.id }));

    const res = await recibirPedidoAction(null, formData({ _id: pedido.id }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/cancelado/i);
    expect(await prisma.movimientoStock.count()).toBe(0);
  });

  it("cajero no puede recibir → forbidden", async () => {
    await signInAs("cajero");
    const pedido = await crearPedidoPendiente({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      proveedorId: seed.proveedor.id,
      lineas: [{ productoId: prodA, cantidad: 10, precioUnitario: 1 }],
    });
    const res = await recibirPedidoAction(null, formData({ _id: pedido.id }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/permiso/i);
  });
});
