// Seed para producción. Crea ÚNICAMENTE el usuario admin a partir de
// SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME.
//
// A diferencia de prisma/seed.ts (dev), este script:
//  - NO carga .env.local (las credenciales se pasan explícitamente al ejecutar).
//  - NO tiene valores por defecto: si faltan envs, falla.
//  - NO crea ediciones, casetas, empleados ni entidades demo.
//
// Uso:
//   DATABASE_URL="<URL production>" \
//   SEED_ADMIN_EMAIL="<email>" \
//   SEED_ADMIN_PASSWORD="<password>" \
//   SEED_ADMIN_NAME="<nombre>" \
//   npx tsx prisma/seed.prod.ts

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

async function main() {
  const adminEmail = requireEnv("SEED_ADMIN_EMAIL");
  const adminPassword = requireEnv("SEED_ADMIN_PASSWORD");
  const adminName = requireEnv("SEED_ADMIN_NAME");
  requireEnv("DATABASE_URL");

  if (adminPassword.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres en producción");
  }

  const { prisma } = await import("../src/lib/prisma");
  const { auth } = await import("../src/lib/auth");

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`✓ Admin ya existía: ${adminEmail} — no se modifica`);
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

  console.log(`✓ Admin creado: ${adminEmail}`);
  console.log("  Cambia la contraseña en el primer login.");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
