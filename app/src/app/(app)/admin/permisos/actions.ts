"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/authz";
import { type ActionResult, toActionError } from "@/lib/action-result";
import type { Rol } from "@prisma/client";
import type { Permission } from "@/lib/permissions/catalog";

const schema = z.object({
  rol: z.enum(["admin", "gerente", "cajero"]),
  permiso: z.string().min(1),
  activo: z.boolean(),
});

export async function actualizarPermisoAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requirePermiso("admin.permisos.editar");

    const rawRol = formData.get("rol");
    const rawPermiso = formData.get("permiso");
    const rawActivo = formData.get("activo");

    const input = schema.parse({
      rol: rawRol,
      permiso: rawPermiso,
      activo: rawActivo === "true",
    });

    if (input.activo) {
      // Upsert: agregar permiso
      await prisma.rolPermiso.upsert({
        where: { rol_permiso: { rol: input.rol as Rol, permiso: input.permiso } },
        update: {},
        create: { rol: input.rol as Rol, permiso: input.permiso },
      });
    } else {
      // Delete: quitar permiso
      await prisma.rolPermiso.delete({
        where: { rol_permiso: { rol: input.rol as Rol, permiso: input.permiso } },
      });
    }

    revalidatePath("/admin/permisos");
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err);
  }
}
