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
  ["edicion-activa"],
  { revalidate: 3600, tags: [EDICION_CACHE_TAG] }
);

export function invalidarEdicionActiva(): void {
  updateTag(EDICION_CACHE_TAG);
}
