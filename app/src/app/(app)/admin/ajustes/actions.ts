"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import {
  parseForm,
  toActionError,
  type ActionResult,
} from "@/lib/action-result";
import {
  VARIABLES_RECHAZO_VOLUNTARIO,
  extraerVariables,
  invalidarPlantillas,
} from "@/lib/plantillas";

const schema = z.object({
  clave: z.string().min(1),
  asunto: z.string().max(200).optional(),
  cuerpo: z.string().min(1).max(4000),
});

export async function actualizarPlantillaAction(
  _prev: ActionResult<{ clave: string }> | null,
  formData: FormData
): Promise<ActionResult<{ clave: string }>> {
  try {
    const { user } = await requireRole(["admin"]);
    const data = parseForm(schema, formData);

    const usadas = extraerVariables(data.cuerpo);
    const noPermitidas = usadas.filter(
      (v) => !VARIABLES_RECHAZO_VOLUNTARIO.includes(v as never)
    );
    if (noPermitidas.length > 0) {
      return {
        ok: false,
        error: `Variables no permitidas: ${noPermitidas.map((v) => `{${v}}`).join(", ")}`,
        fieldErrors: { cuerpo: ["Contiene variables no permitidas."] },
      };
    }

    await withAuditContext(user.id, () =>
      prisma.plantillaMensaje.update({
        where: { clave: data.clave },
        data: {
          asunto: data.asunto ?? null,
          cuerpo: data.cuerpo,
          updatedById: user.id,
        },
      })
    );

    invalidarPlantillas();
    revalidatePath("/admin/ajustes");
    return { ok: true, data: { clave: data.clave } };
  } catch (err) {
    return toActionError(err);
  }
}
