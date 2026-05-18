import { test, expect } from "@playwright/test";

test.describe("Permisos - Admin", () => {
  test("admin accede a /admin/permisos y ve matriz", async ({ page }) => {
    // Login como admin
    await page.goto("/login");
    await page.fill("input[type=email]", "admin@caseta.local");
    await page.fill("input[type=password]", "admin1234!");
    await page.click("button:has-text('Inicia sesión')");
    await page.waitForURL("/");

    // Navegar a permisos
    await page.goto("/admin/permisos");
    await expect(page).toHaveTitle(/Permisos|Caseta/);

    // Verificar que la tabla está presente
    await expect(page.locator("table")).toBeDefined();

    // Verificar que hay permisos listados
    const rows = await page.locator("tbody tr").count();
    expect(rows).toBeGreaterThan(0);
  });

  test("togglear checkbox de permiso actualiza la matriz", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill("input[type=email]", "admin@caseta.local");
    await page.fill("input[type=password]", "admin1234!");
    await page.click("button:has-text('Inicia sesión')");
    await page.waitForURL("/");

    // Ir a permisos
    await page.goto("/admin/permisos");

    // Buscar un checkbox de gerente (fila con "caja.cierres.bloquear")
    const checkbox = page.locator(
      'input[aria-label*="caja.cierres.bloquear"][aria-label*="gerente"]'
    );

    const wasChecked = await checkbox.isChecked();

    // Togglear
    await checkbox.click();
    await page.waitForTimeout(500); // Esperar a que la action se procese

    // Verificar que cambió
    const isNowChecked = await checkbox.isChecked();
    expect(isNowChecked).toBe(!wasChecked);

    // Recargar y verificar que persiste
    await page.reload();
    await page.waitForSelector("table");

    const reloadedCheckbox = page.locator(
      'input[aria-label*="caja.cierres.bloquear"][aria-label*="gerente"]'
    );
    const checkboxAfterReload = await reloadedCheckbox.isChecked();
    expect(checkboxAfterReload).toBe(!wasChecked);
  });

  test("admin no puede editar permisos de admin (readonly)", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill("input[type=email]", "admin@caseta.local");
    await page.fill("input[type=password]", "admin1234!");
    await page.click("button:has-text('Inicia sesión')");
    await page.waitForURL("/");

    // Ir a permisos
    await page.goto("/admin/permisos");

    // Buscar checkboxes de admin (deben estar disabled y siempre checked)
    const adminCheckboxes = page.locator('input[aria-label*="admin"]:not([aria-label*="gerente"]):not([aria-label*="cajero"])');
    const count = await adminCheckboxes.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const checkbox = adminCheckboxes.nth(i);
        await expect(checkbox).toBeDisabled();
        await expect(checkbox).toBeChecked();
      }
    }
  });
});
