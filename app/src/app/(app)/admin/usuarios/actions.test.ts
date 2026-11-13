import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { desactivarUsuarioAction, actualizarUsuarioAction } from "./actions";
import { prisma } from "@/lib/prisma";
import { resetAndSeed } from "@/test/integration-helpers";
import { signInAs, clearTestCookie } from "@/test/auth-helper";

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.append(k, v);
  return f;
}

async function sesionesDe(email: string): Promise<number> {
  return prisma.session.count({ where: { user: { email } } });
}

describe("revocar sesiones al desactivar o cambiar rol", () => {
  beforeEach(async () => {
    await resetAndSeed();
  });

  afterAll(async () => {
    clearTestCookie();
    await prisma.$disconnect();
  });

  it("desactivarUsuarioAction borra las sesiones del usuario desactivado", async () => {
    await signInAs("cajero");
    expect(await sesionesDe("cajero@caseta.test")).toBeGreaterThan(0);
    const cajero = await prisma.user.findUniqueOrThrow({ where: { email: "cajero@caseta.test" } });

    await signInAs("admin");
    const res = await desactivarUsuarioAction(null, fd({ _id: cajero.id }));

    expect(res.ok).toBe(true);
    expect(await sesionesDe("cajero@caseta.test")).toBe(0);
  });

  it("actualizarUsuarioAction borra las sesiones si cambia el rol", async () => {
    await signInAs("gerente");
    const gerente = await prisma.user.findUniqueOrThrow({ where: { email: "gerente@caseta.test" } });

    await signInAs("admin");
    await expect(
      actualizarUsuarioAction(
        null,
        fd({ _id: gerente.id, name: gerente.name, rol: "cajero", activo: "on" })
      )
    ).rejects.toThrow(/REDIRECT/);

    expect(await sesionesDe("gerente@caseta.test")).toBe(0);
  });

  it("actualizarUsuarioAction conserva las sesiones si solo cambia el nombre", async () => {
    await signInAs("gerente");
    const gerente = await prisma.user.findUniqueOrThrow({ where: { email: "gerente@caseta.test" } });

    await signInAs("admin");
    await expect(
      actualizarUsuarioAction(
        null,
        fd({ _id: gerente.id, name: "Otro nombre", rol: gerente.rol, activo: "on" })
      )
    ).rejects.toThrow(/REDIRECT/);

    expect(await sesionesDe("gerente@caseta.test")).toBeGreaterThan(0);
  });
});
