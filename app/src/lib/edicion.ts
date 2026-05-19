import "server-only";
import { unstable_cache, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

const EDICION_CACHE_TAG = "edicion-activa";

export const obtenerEdicionActiva = unstable_cache(
  async () => {
    return prisma.edicion.findFirst({
      where: { activa: true },
      orderBy: { anio: "desc" },
    });
  },
  [EDICION_CACHE_TAG],
  { revalidate: 3600, tags: [EDICION_CACHE_TAG] }
);

/**
 * Invalida el caché de la edición activa.
 * Solo puede llamarse desde una Server Action.
 * Para Route Handlers, usar `revalidateTag("edicion-activa")` directamente.
 */
export function invalidarEdicionActiva(): void {
  updateTag(EDICION_CACHE_TAG);
}
