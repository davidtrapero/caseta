import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Rol } from "@prisma/client";
import type { Permission } from "./permissions/catalog";
import { hasPermiso } from "./permissions/runtime";

export class AuthError extends Error {
  constructor(
    message: string,
    public code: "unauthenticated" | "forbidden" | "inactive"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Devuelve la sesión si el usuario tiene alguno de los roles permitidos.
 * Lanza AuthError si no autenticado, inactivo, o sin rol suficiente.
 *
 * Uso en Server Actions:
 *   const session = await requireRole(["admin", "gerente"]);
 */
export async function requireRole(allowedRoles: Rol | Rol[]) {
  const session = await getSession();

  if (!session?.user) {
    throw new AuthError("No autenticado", "unauthenticated");
  }

  const user = session.user as typeof session.user & { rol: Rol; activo: boolean };

  if (!user.activo) {
    throw new AuthError("Cuenta desactivada", "inactive");
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(user.rol)) {
    throw new AuthError(
      `Permiso insuficiente (requiere: ${roles.join(", ")})`,
      "forbidden"
    );
  }

  return { session, user };
}

/**
 * Para páginas (RSC). Redirige a /login si no hay sesión.
 */
export async function requireSessionOrRedirect() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Devuelve la sesión si el usuario tiene el permiso requerido.
 * Admin siempre tiene acceso a todo permiso.
 * Lanza AuthError si no autenticado, inactivo, o sin permiso.
 *
 * Uso en Server Actions:
 *   const session = await requirePermiso("admin.usuarios.crud");
 */
export async function requirePermiso(requiredPermiso: Permission) {
  const session = await getSession();

  if (!session?.user) {
    throw new AuthError("No autenticado", "unauthenticated");
  }

  const user = session.user as typeof session.user & { rol: Rol; activo: boolean };

  if (!user.activo) {
    throw new AuthError("Cuenta desactivada", "inactive");
  }

  // Admin siempre tiene acceso
  if (user.rol === "admin") {
    return { session, user };
  }

  // Verificar permiso para gerente/cajero
  const tiene = await hasPermiso(user.rol, requiredPermiso);
  if (!tiene) {
    throw new AuthError(
      `Permiso insuficiente (requiere: ${requiredPermiso})`,
      "forbidden"
    );
  }

  return { session, user };
}
