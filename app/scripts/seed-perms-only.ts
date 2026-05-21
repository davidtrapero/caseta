import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: true });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { DEFAULT_PERMISSIONS_BY_ROLE } = await import("../src/lib/permissions/catalog");

  console.log("🔐 Resiembra de permisos por rol...\n");

  for (const [rol, permisos] of Object.entries(DEFAULT_PERMISSIONS_BY_ROLE)) {
    console.log(`▪️ ${rol} (${permisos.length} permisos)`);
    for (const permiso of permisos) {
      await prisma.rolPermiso.upsert({
        where: { rol_permiso: { rol: rol as any, permiso } },
        update: {},
        create: { rol: rol as any, permiso },
      });
    }
  }

  const permCount = await prisma.rolPermiso.count();
  console.log(`\n✅ ${permCount} permisos cargados correctamente`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
