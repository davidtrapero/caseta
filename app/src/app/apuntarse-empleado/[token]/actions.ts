"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/action-result";

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function buscarEmpleadoPorDniAction(
  formData: FormData
): Promise<
  ActionResult<{
    encontrado: boolean;
    datos?: { nombre: string; email?: string; telefono?: string };
  }>
> {
  try {
    // Extraer y validar DNI
    const dni = (formData.get("dni") as string)?.trim() ?? "";
    if (!dni) {
      return { ok: true, data: { encontrado: false } };
    }

    // Obtener IP del cliente
    const ip = await getClientIp();

    // Verificar rate-limit
    const rl = checkRateLimit(ip, "apuntarse-empleado-lookup", 20, 60_000);
    if (!rl.allowed) {
      return { ok: true, data: { encontrado: false } };
    }

    // Buscar empleado por DNI
    const empleado = await prisma.empleado.findUnique({
      where: { dni },
      select: {
        nombre: true,
        email: true,
        telefono: true,
        activo: true,
        esVoluntario: true,
      },
    });

    // Retornar false si no encontrado, inactivo o voluntario
    if (!empleado || !empleado.activo || empleado.esVoluntario) {
      return { ok: true, data: { encontrado: false } };
    }

    // Retornar datos del empleado
    return {
      ok: true,
      data: {
        encontrado: true,
        datos: {
          nombre: empleado.nombre,
          email: empleado.email ?? undefined,
          telefono: empleado.telefono ?? undefined,
        },
      },
    };
  } catch {
    // Respuesta uniforme en caso de error (seguridad contra enumeración)
    return { ok: true, data: { encontrado: false } };
  }
}
