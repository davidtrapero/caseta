// Helpers para suites de integración Vitest.
// Cada suite llama setupIntegrationSuite() en su afterAll para cerrar Prisma
// y testReset() en beforeEach para dejar la BD limpia.
import { resetDb } from "./db-reset";
import { seedMinimal, type MinimalSeed } from "./fixtures";
import { clearTestCookie, signInAs } from "./auth-helper";

/**
 * Reset completo + seedMinimal. Devuelve el seed para que los tests usen
 * los IDs (edicion, caseta, proveedor, admin, gerente, cajero).
 */
export async function resetAndSeed(): Promise<MinimalSeed> {
  clearTestCookie();
  await resetDb();
  return seedMinimal();
}

/**
 * Atajo: resetea + siembra + inicia sesión con el rol indicado.
 * Devuelve el seed y el userId autenticado.
 */
export async function setupWithSession(
  rol: "admin" | "gerente" | "cajero" = "admin"
): Promise<MinimalSeed & { userId: string }> {
  const seed = await resetAndSeed();
  const { userId } = await signInAs(rol);
  return { ...seed, userId };
}

/**
 * Construye un FormData desde un objeto plano, convirtiendo undefined a "".
 * Simplifica escribir tests de server actions que leen de FormData.
 */
export function formData(obj: Record<string, string | number | boolean | undefined | null>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    fd.append(key, String(value));
  }
  return fd;
}
