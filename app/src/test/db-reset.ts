// Vacía todas las tablas del dominio + auth en una única query.
// TRUNCATE CASCADE + RESTART IDENTITY para dejar el branch listo para
// cualquier suite. Se invoca desde:
//  - vitest beforeEach (vía helper en tests)
//  - Playwright globalSetup (src/test/e2e-setup.ts)
//  - endpoint /api/_test/reset (sólo si NODE_ENV==='test')
//
// Orden implícito: TRUNCATE ... CASCADE se encarga de dependencias;
// sólo hay que listar todas las tablas "hojas" y "raíces" juntas.
//
// Carga env eager si se invoca como script (antes del import dinámico
// de prisma, que exige DATABASE_URL al construirse).
if (require.main === module) {
  // Sincronísta dotenv al toplevel sin await.
  require("./load-env");
}

const TABLAS = [
  // Dominio (en minúsculas Prisma usa el nombre del modelo como tabla,
  // pero los mapeos @@map de auth usan snake_case).
  '"AuditLog"',
  '"Nomina"',
  '"CierreDiario"',
  '"Gasto"',
  '"DetallePedido"',
  '"Pedido"',
  '"MovimientoStock"',
  '"Stock"',
  '"Producto"',
  '"Proveedor"',
  '"TurnoEmpleado"',
  '"TurnoPlaza"',
  '"Turno"',
  '"Empleado"',
  '"Caseta"',
  '"Edicion"',
  // Better Auth (@@map a snake_case).
  '"session"',
  '"account"',
  '"verification"',
  '"user"',
];

export async function resetDb(): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const sql = `TRUNCATE ${TABLAS.join(", ")} RESTART IDENTITY CASCADE`;
  await prisma.$executeRawUnsafe(sql);
}

// Permite ejecutarlo directamente: `tsx src/test/db-reset.ts`.
if (require.main === module) {
  (async () => {
    await resetDb();
    const { prisma } = await import("@/lib/prisma");
    console.log("✓ BD de test limpia");
    await prisma.$disconnect();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
