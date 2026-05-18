import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AsyncLocalStorage } from "async_hooks";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/authz";
import { hasPermiso, loadPermisosForRol } from "@/lib/permissions/runtime";
import type { User, Rol } from "@prisma/client";
import { auth } from "@/lib/auth";

// Mock de sesión para tests
const auditStore = new AsyncLocalStorage<{ userId: string }>();

// Helpers para crear usuarios de test
async function crearUsuarioTest(rol: Rol) {
  // Limpiar primero si existe
  const email = `test-${rol}-${Date.now()}@test.local`;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  // Crear via Better Auth
  const result = await auth.api.signUpEmail({
    body: {
      email,
      password: "Test1234!",
      name: `Test ${rol}`,
    },
  });

  if (!result.user?.id) throw new Error("No se pudo crear usuario de test");

  // Actualizar rol
  await prisma.user.update({
    where: { id: result.user.id },
    data: { rol, activo: true },
  });

  return result.user as User;
}

describe("Permissions Runtime", () => {
  describe("hasPermiso", () => {
    it("admin siempre tiene acceso a todo", async () => {
      const tiene = await hasPermiso("admin", "caja.cierres.bloquear");
      expect(tiene).toBe(true);
    });

    it("gerente tiene acceso a permisos asignados", async () => {
      // Asegurar que gerente tiene este permiso
      await prisma.rolPermiso.upsert({
        where: { rol_permiso: { rol: "gerente", permiso: "caja.cierres.crear" } },
        update: {},
        create: { rol: "gerente", permiso: "caja.cierres.crear" },
      });

      const tiene = await hasPermiso("gerente", "caja.cierres.crear");
      expect(tiene).toBe(true);
    });

    it("gerente no tiene acceso a permisos no asignados", async () => {
      // Asegurar que gerente NO tiene este permiso
      await prisma.rolPermiso.deleteMany({
        where: {
          rol: "gerente",
          permiso: "admin.usuarios.editar",
        },
      });

      const tiene = await hasPermiso("gerente", "admin.usuarios.editar");
      expect(tiene).toBe(false);
    });

    it("cajero tiene acceso limitado", async () => {
      // Asegurar que cajero tiene este permiso
      await prisma.rolPermiso.upsert({
        where: { rol_permiso: { rol: "cajero", permiso: "caja.cierres.crear" } },
        update: {},
        create: { rol: "cajero", permiso: "caja.cierres.crear" },
      });

      const tiene = await hasPermiso("cajero", "caja.cierres.crear");
      expect(tiene).toBe(true);

      // Y no tiene otros permisos
      const noTiene = await hasPermiso("cajero", "admin.usuarios.editar");
      expect(noTiene).toBe(false);
    });
  });

  describe("loadPermisosForRol", () => {
    it("retorna Set de permisos para admin (siempre completo)", async () => {
      const permisos = await loadPermisosForRol("admin");
      expect(permisos.size).toBeGreaterThan(30); // Debe tener muchos permisos
      expect(permisos.has("admin.usuarios.editar")).toBe(true);
      expect(permisos.has("caja.cierres.crear")).toBe(true);
    });

    it("retorna Set de permisos para gerente desde BD", async () => {
      // Limpiar permisos de gerente
      await prisma.rolPermiso.deleteMany({ where: { rol: "gerente" } });

      // Asignar solo algunos
      await prisma.rolPermiso.createMany({
        data: [
          { rol: "gerente", permiso: "caja.cierres.crear" },
          { rol: "gerente", permiso: "turnos.semana.ver" },
        ],
      });

      const permisos = await loadPermisosForRol("gerente");
      expect(permisos.has("caja.cierres.crear")).toBe(true);
      expect(permisos.has("turnos.semana.ver")).toBe(true);
      expect(permisos.has("admin.usuarios.editar")).toBe(false);
    });

    it("cambios dinámicos en BD se reflejan en nuevo request", async () => {
      // Primer request: sin permiso
      await prisma.rolPermiso.deleteMany({
        where: { rol: "cajero", permiso: "turnos.semana.ver" },
      });

      let permisos = await loadPermisosForRol("cajero");
      expect(permisos.has("turnos.semana.ver")).toBe(false);

      // Agregar permiso
      await prisma.rolPermiso.create({
        data: { rol: "cajero", permiso: "turnos.semana.ver" },
      });

      // Nuevo request (simulado: new cache context)
      // En un request real, React.cache() se resetea automáticamente
      permisos = await loadPermisosForRol("cajero");
      expect(permisos.has("turnos.semana.ver")).toBe(true);
    });
  });

  // Limpieza de test
  afterAll(async () => {
    // Borrar usuarios de test si los hay
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "@test.local",
        },
      },
    });
  });
});
