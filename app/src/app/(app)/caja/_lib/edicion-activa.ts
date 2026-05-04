import { prisma } from "@/lib/prisma";

export async function obtenerEdicionActiva() {
  return prisma.edicion.findFirst({
    where: { activa: true },
    orderBy: { anio: "desc" },
  });
}
