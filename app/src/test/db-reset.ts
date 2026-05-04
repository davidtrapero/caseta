// Vacía todas las tablas del dominio + auth en una única query.
// TRUNCATE CASCADE + RESTART IDENTITY para dejar el branch listo para
// cualquier suite. Se invoca desde:
//  - vitest beforeEach (vía helper en tests)
//  - Playwright globalSetup (src/test/e2e-setup.ts)
//  - endpoint /api/test-reset (sólo si NODE_ENV==='test')
//
// Orden implícito: TRUNCATE ... CASCADE se encarga de dependencias;
// sólo hay que listar todas las tablas "hojas" y "raíces" juntas.
//
// Para ejecutar como script standalone, usar scripts/reset-db.ts
// (el CLI vive fuera para evitar side-effects en entornos ESM).

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

import { prisma } from "../lib/prisma";

export async function resetDb(): Promise<void> {
  const sql = `TRUNCATE ${TABLAS.join(", ")} RESTART IDENTITY CASCADE`;
  await prisma.$executeRawUnsafe(sql);
}
