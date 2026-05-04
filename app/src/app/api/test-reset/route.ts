// Endpoint sólo para tests: resetea + re-siembra la BD.
// Protegido por NODE_ENV==='test' + header x-test-secret.
// Devuelve 404 fuera de test. En producción nunca hay test-reset
// porque Next 16 compila la ruta pero el guard de NODE_ENV la inhabilita.
import { NextResponse } from "next/server";
import { resetDb } from "@/test/db-reset";
import { seedMinimal } from "@/test/fixtures";

const SECRET = process.env.BETTER_AUTH_SECRET ?? "";

export async function POST(req: Request) {
  // Doble guard: el endpoint SOLO responde si NODE_ENV != production Y
  // la variable explícita ENABLE_TEST_ENDPOINTS=true está presente.
  //
  // Notas:
  // - `next dev` fuerza NODE_ENV=development (no permite "test"), así que
  //   no podemos exigir NODE_ENV="test". Sí prohibimos "production".
  // - El flag explícito es el guard real. Sólo .env.test lo define.
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_TEST_ENDPOINTS !== "true"
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const header = req.headers.get("x-test-secret");
  if (!header || header !== SECRET) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await resetDb();
  const seed = await seedMinimal();
  return NextResponse.json({
    ok: true,
    seed: {
      edicionId: seed.edicion.id,
      casetaId: seed.caseta.id,
      proveedorId: seed.proveedor.id,
    },
  });
}
