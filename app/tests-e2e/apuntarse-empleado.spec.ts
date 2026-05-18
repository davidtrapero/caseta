// E2E: flujo completo del formulario público de empleados.
// Cubre: carga de página, búsqueda de DNI, envío correcto y validación de solape.
//
// Requiere servidor Next en http://localhost:3100 (levantado por playwright.config.ts)
// y variable ENABLE_TEST_ENDPOINTS=true.

import { test, expect } from "@playwright/test";
import { resetServerDb } from "./_helpers";

const TEST_SECRET = process.env.BETTER_AUTH_SECRET ?? "";

// ──────────────────────────────────────────────────────────────────
// Helper: llama al endpoint de seed específico para el formulario de empleados.
// Devuelve token, IDs de turnos y el DNI del empleado de seed.
// ──────────────────────────────────────────────────────────────────
async function seedEmpleadoForm(
  request: import("@playwright/test").APIRequestContext,
  baseURL: string
): Promise<{
  formularioToken: string;
  turno1Id: string;
  turno2Id: string;
  turnoSolapeId: string;
  dniSeed: string;
}> {
  const res = await request.post(
    `${baseURL}/api/test-seed-empleado-form`,
    { headers: { "x-test-secret": TEST_SECRET } }
  );
  if (!res.ok()) {
    const text = await res.text();
    throw new Error(`seed endpoint returned ${res.status()}: ${text.slice(0, 200)}`);
  }
  const text = await res.text();
  let json: { ok: boolean; data: { formularioToken: string; turno1Id: string; turno2Id: string; turnoSolapeId: string; dniSeed: string } };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`seed endpoint returned non-JSON (${res.status()}): ${text.slice(0, 300)}`);
  }
  if (!json.ok) throw new Error(`seed endpoint error: ${JSON.stringify(json)}`);
  return json.data;
}

// ──────────────────────────────────────────────────────────────────
// Suite
// ──────────────────────────────────────────────────────────────────
test.describe("apuntarse-empleado @e2e", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    // Limpiar BD y sembrar datos mínimos (usuarios, edición, caseta, proveedor).
    await resetServerDb(request, baseURL!);
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 1: La página carga con el heading correcto
  // ────────────────────────────────────────────────────────────────
  test("carga el formulario y muestra el heading", async ({ page, request, baseURL }) => {
    const { formularioToken } = await seedEmpleadoForm(request, baseURL!);

    await page.goto(`/apuntarse-empleado/${formularioToken}`);

    // No debe redirigir al login (es público)
    await expect(page).not.toHaveURL(/\/login/);

    // Heading principal presente
    await expect(
      page.getByRole("heading", { name: /apuntarse como empleado/i })
    ).toBeVisible();

    // Input de DNI presente
    await expect(page.locator("input[name='dni']")).toBeVisible();

    // Al menos un turno disponible (creado por el seed)
    await expect(
      page.locator("input[type='checkbox'][name='turnoIds']").first()
    ).toBeVisible({ timeout: 8_000 });
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 2: Búsqueda de DNI rellena campos automáticamente
  // ────────────────────────────────────────────────────────────────
  test("buscar DNI existente autocompleta nombre y email", async ({ page, request, baseURL }) => {
    const { formularioToken, dniSeed } = await seedEmpleadoForm(request, baseURL!);

    await page.goto(`/apuntarse-empleado/${formularioToken}`);
    await expect(
      page.getByRole("heading", { name: /apuntarse como empleado/i })
    ).toBeVisible();

    const dniInput = page.locator("input[name='dni']");
    await dniInput.fill(dniSeed);
    // Disparar onBlur para activar la búsqueda asíncrona
    await dniInput.blur();

    // Esperar confirmación visual "Empleado encontrado"
    await expect(page.getByText(/empleado encontrado/i)).toBeVisible({ timeout: 10_000 });

    // El campo nombre debe haberse rellenado automáticamente
    const nombreValue = await page.locator("input[name='nombre']").inputValue();
    expect(nombreValue.length).toBeGreaterThan(0);

    // El campo email debe haberse rellenado con una dirección válida
    const emailValue = await page.locator("input[name='email']").inputValue();
    expect(emailValue).toContain("@");
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 3: Envío completo con datos válidos redirige a /gracias
  // ────────────────────────────────────────────────────────────────
  test("envío completo redirige a /gracias", async ({ page, request, baseURL }) => {
    const { formularioToken, turno1Id } = await seedEmpleadoForm(request, baseURL!);

    await page.goto(`/apuntarse-empleado/${formularioToken}`);
    await expect(
      page.getByRole("heading", { name: /apuntarse como empleado/i })
    ).toBeVisible();

    // DNI nuevo (no existe en BD → no autocomplete, pero válido para enviar)
    const dniInput = page.locator("input[name='dni']");
    await dniInput.fill("98765432Z");
    await dniInput.blur();
    // Pequeña espera para que el lookup asíncrono finalice
    await page.waitForTimeout(600);

    // Datos de contacto obligatorios
    await page.locator("input[name='nombre']").fill("Carlos Ruiz");
    await page.locator("input[name='email']").fill("carlos.ruiz@test.com");

    // Marcar el turno con ID conocido
    const turnoCheckbox = page.locator(
      `input[type='checkbox'][name='turnoIds'][value='${turno1Id}']`
    );
    await expect(turnoCheckbox).toBeVisible({ timeout: 8_000 });
    await turnoCheckbox.check();

    // Enviar formulario
    await page.getByRole("button", { name: /apuntarme/i }).click();

    // Debe redirigir a /gracias
    await page.waitForURL(
      `**/apuntarse-empleado/${formularioToken}/gracias`,
      { timeout: 15_000 }
    );

    // Heading de confirmación presente
    await expect(
      page.getByRole("heading", { name: /gracias/i })
    ).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 4: Turnos solapados muestran mensaje de error
  // ────────────────────────────────────────────────────────────────
  test("turnos solapados muestran error y no navegan a /gracias", async ({ page, request, baseURL }) => {
    // turno1: 10:00–14:00  |  turnoSolape: 12:00–15:00  → solapan
    const { formularioToken, turno1Id, turnoSolapeId } =
      await seedEmpleadoForm(request, baseURL!);

    await page.goto(`/apuntarse-empleado/${formularioToken}`);
    await expect(
      page.getByRole("heading", { name: /apuntarse como empleado/i })
    ).toBeVisible();

    // Datos de contacto
    await page.locator("input[name='dni']").fill("11223344B");
    await page.locator("input[name='dni']").blur();
    await page.waitForTimeout(400);
    await page.locator("input[name='nombre']").fill("Test Solape");
    await page.locator("input[name='email']").fill("solape@test.com");

    // Marcar los dos turnos que solapan
    const checkTurno1 = page.locator(
      `input[type='checkbox'][name='turnoIds'][value='${turno1Id}']`
    );
    const checkSolape = page.locator(
      `input[type='checkbox'][name='turnoIds'][value='${turnoSolapeId}']`
    );
    await expect(checkTurno1).toBeVisible({ timeout: 8_000 });
    await expect(checkSolape).toBeVisible({ timeout: 8_000 });
    await checkTurno1.check();
    await checkSolape.check();

    // Enviar
    await page.getByRole("button", { name: /apuntarme/i }).click();

    // Debe mostrar mensaje de error con "solap"
    await expect(page.getByText(/solap/i)).toBeVisible({ timeout: 10_000 });

    // No debe navegar a /gracias
    await expect(page).not.toHaveURL(/\/gracias/);
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 5: Token inválido devuelve 404 o no muestra el formulario
  // ────────────────────────────────────────────────────────────────
  test("token inválido no muestra el formulario", async ({ page }) => {
    // Token demasiado corto → la página llama a notFound()
    const response = await page.goto("/apuntarse-empleado/token-falso-cortito");

    const status = response?.status() ?? 0;
    const dniInput = page.locator("input[name='dni']");

    if (status === 404) {
      expect(status).toBe(404);
    } else {
      // Next puede renderizar página 404 con status 200 según configuración
      await expect(dniInput).not.toBeVisible();
    }
  });
});
