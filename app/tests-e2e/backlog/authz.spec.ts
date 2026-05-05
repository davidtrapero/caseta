import { test, expect } from "@playwright/test";
import { loginUI, resetServerDb } from "../_helpers";

test.describe("Autorización por rol en UI", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    await resetServerDb(request, baseURL!);
  });

  test("cajero ve /admin/ediciones pero NO el botón de crear", async ({
    page,
  }) => {
    await loginUI(page, "cajero");
    await page.goto("/admin/ediciones");
    // La página carga (el proxy sólo valida cookie, no rol).
    await expect(page.getByRole("heading", { name: /ediciones/i })).toBeVisible();
    // Botón "Nueva edición" NO visible para cajero.
    await expect(
      page.getByRole("link", { name: /nueva edición/i })
    ).toHaveCount(0);
  });

  test("cajero NO puede acceder a /inventario/productos/nuevo", async ({
    page,
  }) => {
    await loginUI(page, "cajero");
    const response = await page.goto("/inventario/productos/nuevo");
    // requireRole redirige o lanza. Esperamos estado no-200 o que no se renderice el formulario.
    // Playwright no expone bien el error; verificamos que no hay form de creación.
    await expect(
      page.getByRole("button", { name: /crear producto/i })
    ).toHaveCount(0);
  });
});
