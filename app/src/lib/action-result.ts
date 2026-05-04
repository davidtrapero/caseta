import { ZodError, type ZodType } from "zod";
import { AuthError } from "@/lib/authz";

export type FieldErrors = Record<string, string[]>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function parseForm<T>(schema: ZodType<T>, formData: FormData): T {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("_")) continue; // descarta _action, _id, etc.
    raw[key] = value === "" ? undefined : value;
  }
  return schema.parse(raw);
}

/**
 * Mapea errores comunes (Auth + Zod + Prisma unique) a ActionResult.
 * Usar envolviendo la lógica de cada Server Action para homogeneizar mensajes.
 */
export function toActionError(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) {
    return { ok: false, error: err.message };
  }
  if (err instanceof ZodError) {
    const fieldErrors: FieldErrors = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
  }
  const msg = err instanceof Error ? err.message : "Error inesperado";
  // Prisma unique constraint
  if (msg.includes("Unique constraint") || msg.includes("P2002")) {
    return { ok: false, error: "Ya existe un registro con esos datos únicos." };
  }
  return { ok: false, error: msg };
}
