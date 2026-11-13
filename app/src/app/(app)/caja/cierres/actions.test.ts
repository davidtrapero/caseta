import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { actualizarCierreAction } from "./actions";
import { prisma } from "@/lib/prisma";
import { resetAndSeed, formData } from "@/test/integration-helpers";
import { crearCierre } from "@/test/fixtures";
import { signInAs } from "@/test/auth-helper";
import type { MinimalSeed } from "@/test/fixtures";

// actualizarCierreAction llama redirect() tras ok → el mock lanza.
// Usamos try/catch con digest NEXT_REDIRECT para detectar éxito.
function expectRedirectOrOk(promise: Promise<unknown>) {
  return promise.catch((err) => {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) return { ok: true };
    throw err;
  });
}

describe("actualizarCierreAction: cierre bloqueado", () => {
  let seed: MinimalSeed;
  let cierreId: string;

  beforeEach(async () => {
    seed = await resetAndSeed();
    const cierre = await crearCierre({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      fecha: new Date(Date.UTC(2026, 4, 2)),
      ingresosTotales: 500,
    });
    // Bloquearlo.
    await prisma.cierreDiario.update({
      where: { id: cierre.id },
      data: { bloqueado: true },
    });
    cierreId = cierre.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("gerente no puede editar cierre bloqueado", async () => {
    await signInAs("gerente");
    const fd = formData({
      _id: cierreId,
      casetaId: seed.caseta.id,
      fecha: "2026-05-02",
      ingresosTotales: 999,
    });
    const res = await actualizarCierreAction(null, fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/bloqueado/i);
    // Monto no cambió.
    const cierre = await prisma.cierreDiario.findUniqueOrThrow({
      where: { id: cierreId },
    });
    expect(Number(cierre.ingresosTotales)).toBe(500);
  });

  it("admin sí puede editar cierre bloqueado", async () => {
    await signInAs("admin");
    const fd = formData({
      _id: cierreId,
      casetaId: seed.caseta.id,
      fecha: "2026-05-02",
      ingresosTotales: 999,
    });
    // El action hace redirect() tras success → el mock lanza un error NEXT_REDIRECT.
    const res = await expectRedirectOrOk(actualizarCierreAction(null, fd));
    expect(res).toEqual({ ok: true });
    const cierre = await prisma.cierreDiario.findUniqueOrThrow({
      where: { id: cierreId },
    });
    expect(Number(cierre.ingresosTotales)).toBe(999);
  });

  it("cajero no puede editar cierre bloqueado", async () => {
    await signInAs("cajero");
    const fd = formData({
      _id: cierreId,
      casetaId: seed.caseta.id,
      fecha: "2026-05-02",
      ingresosTotales: 999,
    });
    const res = await actualizarCierreAction(null, fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/bloqueado/i);
  });
});

describe("actualizarCierreAction: cierre que se bloquea mientras se edita", () => {
  let seed: MinimalSeed;
  let cierreId: string;

  beforeEach(async () => {
    seed = await resetAndSeed();
    const cierre = await crearCierre({
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      fecha: new Date(Date.UTC(2026, 4, 2)),
      ingresosTotales: 500,
    });
    cierreId = cierre.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Bloquea el cierre después de que la acción lo haya leído como no bloqueado y antes de
  // que escriba: la ventana donde el chequeo previo ya no vale.
  function bloquearJustoAntesDeEscribir() {
    const original = prisma.cierreDiario.update.bind(prisma.cierreDiario) as (
      a: unknown
    ) => Promise<unknown>;
    let bloqueado = false;
    vi.spyOn(prisma.cierreDiario, "update").mockImplementation(((args: unknown) => {
      if (bloqueado) return original(args);
      bloqueado = true;
      return prisma.cierreDiario
        .updateMany({ where: { id: cierreId }, data: { bloqueado: true } })
        .then(() => original(args));
    }) as never);
  }

  it("cajero: si el cierre se bloquea antes de escribir, el importe no cambia", async () => {
    await signInAs("cajero");
    bloquearJustoAntesDeEscribir();

    const res = await actualizarCierreAction(
      null,
      formData({
        _id: cierreId,
        casetaId: seed.caseta.id,
        fecha: "2026-05-02",
        ingresosTotales: 999,
      })
    );

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/bloqueado/i);
    const cierre = await prisma.cierreDiario.findUniqueOrThrow({ where: { id: cierreId } });
    expect(Number(cierre.ingresosTotales)).toBe(500);
  });

  it("admin sigue pudiendo editar aunque se bloquee antes de escribir", async () => {
    await signInAs("admin");
    bloquearJustoAntesDeEscribir();

    await expectRedirectOrOk(
      actualizarCierreAction(
        null,
        formData({
          _id: cierreId,
          casetaId: seed.caseta.id,
          fecha: "2026-05-02",
          ingresosTotales: 999,
        })
      )
    );

    const cierre = await prisma.cierreDiario.findUniqueOrThrow({ where: { id: cierreId } });
    expect(Number(cierre.ingresosTotales)).toBe(999);
  });
});
