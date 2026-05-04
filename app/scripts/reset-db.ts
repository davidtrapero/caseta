// CLI para reset manual del branch de test: npm run test:reset-db
// Carga .env.test y trunca todas las tablas.
import "../src/test/load-env";

(async () => {
  const { resetDb } = await import("../src/test/db-reset");
  const { prisma } = await import("../src/lib/prisma");

  await resetDb();
  console.log("✓ BD de test limpia");
  await prisma.$disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
