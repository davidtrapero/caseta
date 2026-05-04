import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { AuthError, requireRole } from "./authz";
import { prisma } from "./prisma";
import { resetAndSeed } from "@/test/integration-helpers";
import { clearTestCookie, signInAs } from "@/test/auth-helper";

describe("requireRole", () => {
  beforeEach(async () => {
    await resetAndSeed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("sin sesión → AuthError(unauthenticated)", async () => {
    clearTestCookie();
    await expect(requireRole(["admin"])).rejects.toMatchObject({
      name: "AuthError",
      code: "unauthenticated",
    });
  });

  it("usuario inactivo → AuthError(inactive)", async () => {
    // Desactivar ANTES de autenticar: Better Auth cachea la sesión en cookie
    // durante 5 min y no relee el flag `activo` si ya se ha firmado antes.
    // El patrón realista es que un admin inactive al cajero y éste intente usar la app.
    await prisma.user.update({
      where: { email: "cajero@caseta.test" },
      data: { activo: false },
    });
    await signInAs("cajero");
    await expect(requireRole(["cajero"])).rejects.toMatchObject({
      name: "AuthError",
      code: "inactive",
    });
  });

  it("rol insuficiente → AuthError(forbidden)", async () => {
    await signInAs("cajero");
    await expect(requireRole(["admin"])).rejects.toMatchObject({
      name: "AuthError",
      code: "forbidden",
    });
  });

  it("rol permitido → devuelve sesión y user", async () => {
    await signInAs("admin");
    const { user } = await requireRole(["admin", "gerente"]);
    expect(user.rol).toBe("admin");
    expect(user.email).toBe("admin@caseta.test");
  });

  it("acepta rol único (no array)", async () => {
    await signInAs("gerente");
    const { user } = await requireRole("gerente");
    expect(user.rol).toBe("gerente");
  });
});

describe("AuthError", () => {
  it("lleva código semántico", () => {
    const err = new AuthError("X", "forbidden");
    expect(err.code).toBe("forbidden");
    expect(err.name).toBe("AuthError");
  });
});
