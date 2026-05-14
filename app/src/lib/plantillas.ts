import "server-only";
import { unstable_cache, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const VARIABLES_RECHAZO_VOLUNTARIO = [
  "nombre",
  "motivo",
  "turnos",
  "caseta",
  "fechas",
] as const;

export type VariableRechazo = (typeof VARIABLES_RECHAZO_VOLUNTARIO)[number];

export type Plantilla = {
  clave: string;
  asunto: string | null;
  cuerpo: string;
  descripcion: string | null;
  variables: string[];
};

const TAG = "plantillas";

/**
 * Carga una plantilla por clave. Cachea en `unstable_cache` con tag
 * "plantillas". Para invalidar tras edición usar `invalidarPlantillas()`
 * desde una Server Action. Devuelve null si la plantilla no existe.
 */
export const obtenerPlantilla = unstable_cache(
  async (clave: string): Promise<Plantilla | null> => {
    const p = await prisma.plantillaMensaje.findUnique({
      where: { clave },
      select: {
        clave: true,
        asunto: true,
        cuerpo: true,
        descripcion: true,
        variables: true,
      },
    });
    return p;
  },
  ["plantilla"],
  { tags: [TAG] }
);

/**
 * Sustituye placeholders {clave} en el cuerpo con los valores de `vars`.
 * Las claves no presentes en `vars` se mantienen literales (señal para
 * detectar plantillas mal configuradas). Es text-only por contrato — no
 * escapa HTML; si se quiere envío HTML, escapar fuera.
 */
export function renderPlantilla(
  cuerpo: string,
  vars: Record<string, string | undefined>
): string {
  return cuerpo.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

export function invalidarPlantillas(): void {
  updateTag(TAG);
}

/**
 * Extrae las claves usadas como placeholders {clave} en el cuerpo.
 */
export function extraerVariables(cuerpo: string): string[] {
  const matches = cuerpo.matchAll(/\{(\w+)\}/g);
  const set = new Set<string>();
  for (const m of matches) set.add(m[1]);
  return [...set];
}
