import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { buscarEmpleadoPorDniAction } from "../actions";

describe("buscarEmpleadoPorDniAction", () => {
  let empleadoId: string;

  beforeEach(async () => {
    // Crear empleado activo, no voluntario para las pruebas
    const empleado = await prisma.empleado.create({
      data: {
        nombre: "Juan García López",
        dni: "12345678X",
        email: "juan@test.com",
        telefono: "612345678",
        esVoluntario: false,
        activo: true,
      },
    });
    empleadoId = empleado.id;
  });

  afterEach(async () => {
    // Limpiar empleados creados
    await prisma.empleado.deleteMany({
      where: {
        dni: {
          in: ["12345678X", "87654321Y", "11111111A"],
        },
      },
    });
  });

  it("debería encontrar empleado por DNI activo y no voluntario", async () => {
    const formData = new FormData();
    formData.append("dni", "12345678X");

    const result = await buscarEmpleadoPorDniAction(formData);

    expect(result.ok).toBe(true);
    expect(result.data.encontrado).toBe(true);
    expect(result.data.datos).toBeDefined();
    expect(result.data.datos?.nombre).toBe("Juan García López");
    expect(result.data.datos?.email).toBe("juan@test.com");
    expect(result.data.datos?.telefono).toBe("612345678");
  });

  it("debería retornar encontrado: false si DNI no existe", async () => {
    const formData = new FormData();
    formData.append("dni", "99999999Z");

    const result = await buscarEmpleadoPorDniAction(formData);

    expect(result.ok).toBe(true);
    expect(result.data.encontrado).toBe(false);
    expect(result.data.datos).toBeUndefined();
  });

  it("debería retornar encontrado: false si empleado está inactivo", async () => {
    // Desactivar el empleado
    await prisma.empleado.update({
      where: { id: empleadoId },
      data: { activo: false },
    });

    const formData = new FormData();
    formData.append("dni", "12345678X");

    const result = await buscarEmpleadoPorDniAction(formData);

    expect(result.ok).toBe(true);
    expect(result.data.encontrado).toBe(false);
    expect(result.data.datos).toBeUndefined();
  });

  it("debería retornar encontrado: false si empleado es voluntario", async () => {
    // Marcar como voluntario
    await prisma.empleado.update({
      where: { id: empleadoId },
      data: { esVoluntario: true },
    });

    const formData = new FormData();
    formData.append("dni", "12345678X");

    const result = await buscarEmpleadoPorDniAction(formData);

    expect(result.ok).toBe(true);
    expect(result.data.encontrado).toBe(false);
    expect(result.data.datos).toBeUndefined();
  });

  it("debería retornar respuesta uniforme después de 21 llamadas (rate-limit)", async () => {
    const formData = new FormData();
    formData.append("dni", "12345678X");

    // Hacer 21 llamadas desde la misma "IP"
    const results = [];
    for (let i = 0; i < 21; i++) {
      const result = await buscarEmpleadoPorDniAction(formData);
      results.push(result);
    }

    // La llamada 21 debería estar rate-limitada (uniform response)
    const lastResult = results[20]!;
    expect(lastResult.ok).toBe(true);
    expect(lastResult.data.encontrado).toBe(false); // uniform: no diferencia "not found" de "rate-limited"
    expect(lastResult.data.datos).toBeUndefined();
  });

  it("debería retornar respuesta uniforme en caso de error", async () => {
    const formData = new FormData();
    formData.append("dni", ""); // DNI vacío

    const result = await buscarEmpleadoPorDniAction(formData);

    expect(result.ok).toBe(true);
    expect(result.data.encontrado).toBe(false); // uniform error response
    expect(result.data.datos).toBeUndefined();
  });
});
