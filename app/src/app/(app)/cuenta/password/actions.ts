"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requirePermiso } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Introduce tu contraseña actual."),
    newPassword: z.string().min(8, "Mínimo 8 caracteres."),
    repetirPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.repetirPassword, {
    path: ["repetirPassword"],
    message: "Las contraseñas no coinciden.",
  });

export async function cambiarPasswordAction(
  _prev: ActionResult<{ ok: true }> | null,
  formData: FormData
): Promise<ActionResult<{ ok: true }>> {
  try {
    const { user } = await requirePermiso("turnos.semana.ver");
    const data = parseForm(schema, formData);

    await withAuditContext(user.id, async () => {
      await auth.api.changePassword({
        body: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          revokeOtherSessions: true,
        },
        headers: await headers(),
      });
      // Si el usuario cambió tras un reset/alta forzada, limpiamos la flag.
      await prisma.user.update({
        where: { id: user.id },
        data: { debeCambiarPassword: false },
      });
    });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/cuenta/password");
  redirect("/");
}
