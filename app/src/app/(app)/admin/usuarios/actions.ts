"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";
import { crearUsuarioSchema, actualizarUsuarioSchema } from "./schema";

/**
 * Invariante: siempre debe haber al menos 1 admin activo en el sistema.
 * Devuelve true si la operación dejaría el sistema con 0 admins activos.
 */
async function dejariaSinAdmins(
  idAfectado: string,
  cambio: { rol?: string; activo?: boolean }
): Promise<boolean> {
  const afectado = await prisma.user.findUnique({
    where: { id: idAfectado },
    select: { rol: true, activo: true },
  });
  if (!afectado || afectado.rol !== "admin" || !afectado.activo) return false;

  const nuevoRol = cambio.rol ?? afectado.rol;
  const nuevoActivo = cambio.activo ?? afectado.activo;
  const seguirSiendoAdminActivo = nuevoRol === "admin" && nuevoActivo;
  if (seguirSiendoAdminActivo) return false;

  const otrosAdminsActivos = await prisma.user.count({
    where: { rol: "admin", activo: true, id: { not: idAfectado } },
  });
  return otrosAdminsActivos === 0;
}

export async function crearUsuarioAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin"]);
    const data = parseForm(crearUsuarioSchema, formData);

    await withAuditContext(user.id, async () => {
      const result = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: data.password,
          name: data.name,
        },
      });
      if (!result.user) {
        throw new Error("No se pudo crear el usuario.");
      }
      await prisma.user.update({
        where: { id: result.user.id },
        data: { rol: data.rol, activo: data.activo, debeCambiarPassword: true },
      });
    });
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

export async function actualizarUsuarioAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin"]);
    const data = parseForm(actualizarUsuarioSchema, formData);

    // Protección: no permitir auto-desactivación.
    if (user.id === id && data.activo === false) {
      return {
        ok: false,
        error: "No puedes desactivarte a ti mismo.",
      };
    }

    // Protección: no permitir que un admin se quite a sí mismo el rol admin
    // (evita quedarse sin admins accidentalmente en una sesión).
    if (user.id === id && data.rol !== "admin") {
      return {
        ok: false,
        error: "No puedes cambiar tu propio rol.",
      };
    }

    if (await dejariaSinAdmins(id, { rol: data.rol, activo: data.activo })) {
      return {
        ok: false,
        error: "No se puede: dejaría el sistema sin ningún administrador activo.",
      };
    }

    await withAuditContext(user.id, () =>
      prisma.user.update({
        where: { id },
        data: {
          name: data.name,
          rol: data.rol,
          activo: data.activo,
        },
      })
    );
  } catch (err) {
    return toActionError(err);
  }

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

/**
 * Desactiva un usuario (soft-delete). Nunca DELETE físico.
 * Protege contra auto-desactivación.
 */
export async function desactivarUsuarioAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin"]);

    if (user.id === id) {
      return { ok: false, error: "No puedes desactivarte a ti mismo." };
    }

    if (await dejariaSinAdmins(id, { activo: false })) {
      return {
        ok: false,
        error: "No se puede: dejaría el sistema sin ningún administrador activo.",
      };
    }

    await withAuditContext(user.id, () =>
      prisma.user.update({ where: { id }, data: { activo: false } })
    );

    revalidatePath("/admin/usuarios");
    return { ok: true, data: { id } };
  } catch (err) {
    return toActionError(err);
  }
}

export async function reactivarUsuarioAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const { user } = await requireRole(["admin"]);

    await withAuditContext(user.id, () =>
      prisma.user.update({ where: { id }, data: { activo: true } })
    );

    revalidatePath("/admin/usuarios");
    return { ok: true, data: { id } };
  } catch (err) {
    return toActionError(err);
  }
}

const resetearPasswordSchema = z.object({
  userId: z.string().min(1),
  nuevaPassword: z.string().min(8, "Mínimo 8 caracteres."),
});

/**
 * Reset admin: hashea con auth.$context.password.hash y escribe directamente
 * en account.password (providerId="credential"). No usamos el plugin admin()
 * de Better Auth para evitar columnas extra y la divergencia con el campo
 * `rol` (en vez de `role`). Marca debeCambiarPassword=true para que el
 * usuario reciba la pantalla forzada en su próximo acceso.
 */
export async function resetearPasswordAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user } = await requireRole(["admin"]);
    const data = parseForm(resetearPasswordSchema, formData);

    const ctx = await auth.$context;
    const hash = await ctx.password.hash(data.nuevaPassword);

    await withAuditContext(user.id, async () => {
      await prisma.account.updateMany({
        where: { userId: data.userId, providerId: "credential" },
        data: { password: hash },
      });
      await prisma.user.update({
        where: { id: data.userId },
        data: { debeCambiarPassword: true },
      });
    });

    revalidatePath("/admin/usuarios");
    return { ok: true, data: { id: data.userId } };
  } catch (err) {
    return toActionError(err);
  }
}
