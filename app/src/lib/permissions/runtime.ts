/**
 * Runtime permission checking with per-request caching.
 * Uses React cache() for efficient permission lookups within a single request.
 */

import { cache } from "react";
import type { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Permission } from "./catalog";
import { getAdminPermissions } from "./catalog";

/**
 * Cacheado por request. Carga permisos para un rol específico desde la BD.
 * Admin siempre retorna el conjunto completo.
 */
export const loadPermisosForRol = cache(
  async (rol: Rol): Promise<Set<Permission>> => {
    // Admin siempre tiene acceso total
    if (rol === "admin") {
      return getAdminPermissions();
    }

    // Cargar permisos desde BD para gerente/cajero
    const permisos = await prisma.rolPermiso.findMany({
      where: { rol },
      select: { permiso: true },
    });

    return new Set(permisos.map((p) => p.permiso) as Permission[]);
  }
);

/**
 * Retorna true si un rol tiene un permiso específico.
 * Cacheado per-request automáticamente por loadPermisosForRol.
 */
export async function hasPermiso(rol: Rol, permiso: Permission): Promise<boolean> {
  const permisos = await loadPermisosForRol(rol);
  return permisos.has(permiso);
}
