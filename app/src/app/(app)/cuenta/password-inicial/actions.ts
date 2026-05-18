"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requirePermiso } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";

const schema = z
  .object({
    newPassword: z.string().min(8, "Mínimo 8 caracteres."),
    repetirPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.repetirPassword, {
    path: ["repetirPassword"],
    message: "Las contraseñas no coinciden.",
  });

export async function cambiarPasswordInicialAction(
  _prev: ActionResult<{ ok: true }> | null,
  formData: FormData
): Promise<ActionResult<{ ok: true }>> {
  try {
    const { user } = await requirePermiso("turnos.semana.ver");
    const data = parseForm(schema, formData);

    // Solo permitido cuando la flag sigue en true; si ya fue limpiada no
    // tiene sentido permitir un cambio sin verificar la contraseña actual.
    const fresh = await prisma.user.findUnique({
      where: { id: user.id },
      select: { debeCambiarPassword: true },
    });
    if (!fresh?.debeCambiarPassword) {
      return { ok: false, error: "No autorizado." };
    }

    const ctx = await auth.$context;
    const hash = await ctx.password.hash(data.newPassword);

    await withAuditContext(user.id, async () => {
      await prisma.account.updateMany({
        where: { userId: user.id, providerId: "credential" },
        data: { password: hash },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { debeCambiarPassword: false },
      });
    });
  } catch (err) {
    return toActionError(err);
  }
  redirect("/");
}
