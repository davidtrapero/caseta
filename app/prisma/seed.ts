import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
// dotenv/config solo carga .env — .env.local hay que cargarlo explícitamente, antes de cualquier otro import.
dotenvConfig({ path: ".env.local", override: true });

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@caseta.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin1234!";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Admin Caseta";

  // Imports dinámicos para asegurar que las env vars están cargadas antes.
  const { prisma } = await import("../src/lib/prisma");
  const { auth } = await import("../src/lib/auth");

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Usuario admin ya existe (${adminEmail}). Saltando creación.`);
    await prisma.$disconnect();
    return;
  }

  const result = await auth.api.signUpEmail({
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    },
  });

  if (!result.user) {
    throw new Error("No se pudo crear el usuario admin");
  }

  await prisma.user.update({
    where: { id: result.user.id },
    data: { rol: "admin" },
  });

  console.log(`✓ Admin creado: ${adminEmail} (contraseña: ${adminPassword})`);
  console.log("  Cambia la contraseña en el primer login.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
