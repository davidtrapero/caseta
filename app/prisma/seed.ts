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

  // ---- Admin ----
  // La creación de usuarios via Better Auth también se reutiliza en tests
  // desde src/test/fixtures.ts (crearUsuario). Mantener ambos sincronizados.
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`✓ Admin ya existía: ${adminEmail}`);
  } else {
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
  }

  // ---- Edición 2026 ----
  const edicion = await prisma.edicion.upsert({
    where: { anio: 2026 },
    update: {},
    create: {
      anio: 2026,
      nombre: "San Isidro 2026",
      fechaInicio: new Date("2026-05-01"),
      fechaFin: new Date("2026-05-10"),
      activa: true,
    },
  });
  console.log(`✓ Edición: ${edicion.nombre}`);

  // ---- Caseta escenario ----
  const caseta = await prisma.caseta.upsert({
    where: { nombre: "Caseta escenario" },
    update: {},
    create: {
      nombre: "Caseta escenario",
      activa: true,
    },
  });
  console.log(`✓ Caseta: ${caseta.nombre}`);

  // ---- Empleados ----
  const empleados = [
    { nombre: "María López", dni: "00000001A", jornalDiario: 70, perfil: "coordinador" as const },
    { nombre: "Carlos Ruiz", dni: "00000002B", jornalDiario: 75, perfil: "trabajador" as const },
    { nombre: "Ana García", dni: "00000003C", jornalDiario: 65, perfil: "trabajador" as const },
    { nombre: "Javier Moreno", dni: "00000004D", jornalDiario: 80, perfil: "vigilante" as const },
    { nombre: "Lucía Hernández", dni: "00000005E", jornalDiario: 60, perfil: "ayudante" as const },
    { nombre: "Pablo Jiménez", dni: "00000006F", jornalDiario: null, perfil: "voluntario" as const },
    { nombre: "Elena Torres", dni: "00000007G", jornalDiario: null, perfil: "voluntario" as const },
  ];

  for (const e of empleados) {
    await prisma.empleado.upsert({
      where: { dni: e.dni },
      update: { perfil: e.perfil },
      create: {
        nombre: e.nombre,
        dni: e.dni,
        jornalDiario: e.jornalDiario,
        perfil: e.perfil,
        activo: true,
      },
    });
  }
  console.log(`✓ ${empleados.length} empleados listos`);

  // ---- Entidades de voluntarios ----
  const entidadesIniciales = ["Hermandad del Rocío", "Particular"];
  const existenEntidades = await prisma.entidadVoluntario.count();
  if (existenEntidades === 0) {
    for (const nombre of entidadesIniciales) {
      await prisma.entidadVoluntario.create({ data: { nombre } });
    }
    console.log(`✓ ${entidadesIniciales.length} entidades de voluntarios creadas`);
  } else {
    console.log(`✓ Entidades de voluntarios ya existían (${existenEntidades})`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
