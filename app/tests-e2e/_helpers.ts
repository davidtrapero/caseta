// Helpers compartidos por todas las specs de Playwright.
import { type Page, expect } from "@playwright/test";
import { TEST_PASSWORD } from "../src/test/fixtures";

const TEST_SECRET = process.env.BETTER_AUTH_SECRET ?? "";

/**
 * Resetea la BD llamando al endpoint /api/test-reset.
 * Requiere NODE_ENV=test + ENABLE_TEST_ENDPOINTS=true en el servidor.
 */
export async function resetServerDb(
  request: import("@playwright/test").APIRequestContext,
  baseURL: string
): Promise<{ edicionId: string; casetaId: string; proveedorId: string }> {
  const res = await request.post(`${baseURL}/api/test-reset`, {
    headers: { "x-test-secret": TEST_SECRET },
  });
  expect(res.ok()).toBe(true);
  const json = await res.json();
  return json.seed;
}

/**
 * Login UI real con las credenciales sembradas.
 */
export async function loginUI(
  page: Page,
  rol: "admin" | "gerente" | "cajero" = "admin"
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${rol}@caseta.test`);
  await page.getByLabel("Contraseña", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15_000,
  });
  // Drenar el router.refresh() de Next.js que sigue en vuelo tras el redirect.
  // networkidle con timeout corto: si en 3s no para (p.ej. por polling), continuamos igual.
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
}
