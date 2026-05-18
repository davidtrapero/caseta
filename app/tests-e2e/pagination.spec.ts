import { test, expect } from "@playwright/test";
import { loginUI, resetServerDb } from "./_helpers";

test.describe("Paginación @e2e", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    await resetServerDb(request, baseURL!);
  });

  test("navegación URL con ?page=2&pageSize=25", async ({ page }) => {
    await loginUI(page, "admin");

    // Navega a empleados con paginación explícita
    await page.goto("/admin/empleados?page=2&pageSize=25");

    // Verifica que la URL se respeta
    expect(page.url()).toContain("page=2");
    expect(page.url()).toContain("pageSize=25");

    // Verifica que el selector de tamaño muestra 25
    const pageSizeSelect = page.locator("#page-size-select");
    await expect(pageSizeSelect).toHaveValue("25");
  });

  test("cambiar pageSize resetea a página 1", async ({ page }) => {
    await loginUI(page, "admin");

    // Navega a página 3 con 25 registros
    await page.goto("/admin/empleados?page=3&pageSize=25");
    expect(page.url()).toContain("page=3");

    // Cambia pageSize a 50
    await page.locator("#page-size-select").selectOption("50");

    // Espera a que se navegue
    await page.waitForURL(/pageSize=50/);

    // Verifica que page se resetea a 1
    expect(page.url()).toContain("page=1");
    expect(page.url()).toContain("pageSize=50");
  });

  test("ordenación alterna asc → desc → neutro", async ({ page }) => {
    await loginUI(page, "admin");

    // Navega a empleados
    await page.goto("/admin/empleados");

    // Busca un header sortable (si existe "Nombre")
    const nombreHeader = page.getByRole("button", { name: /nombre/i }).first();
    const headerExists = await nombreHeader.isVisible().catch(() => false);

    if (headerExists) {
      // First click: asc
      await nombreHeader.click();
      await page.waitForURL(/sort=.*&order=asc/);
      expect(page.url()).toContain("order=asc");

      // Second click: desc
      await nombreHeader.click();
      await page.waitForURL(/order=desc/);
      expect(page.url()).toContain("order=desc");

      // Third click: remove sort (neutro)
      await nombreHeader.click();
      await page.waitForURL(/page=1/, { timeout: 5000 }).catch(() => {});
      // Verifica que se removió sort/order de la URL
      expect(page.url()).not.toContain("sort=");
      expect(page.url()).not.toContain("order=");
    }
  });

  test("botones prev/next funcionan correctamente", async ({ page }) => {
    await loginUI(page, "admin");

    // Navega a página 2
    await page.goto("/admin/empleados?page=2&pageSize=25");

    // Busca botón siguiente (next)
    const nextButton = page
      .locator('a[href*="page=3"]')
      .filter({ hasNot: page.locator("a[aria-disabled='true']") })
      .first();

    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForURL(/page=3/);
      expect(page.url()).toContain("page=3");

      // Ahora clickea prev
      const prevButton = page
        .locator('a[href*="page=2"]')
        .filter({ hasNot: page.locator("a[aria-disabled='true']") })
        .first();

      if (await prevButton.isVisible().catch(() => false)) {
        await prevButton.click();
        await page.waitForURL(/page=2/);
        expect(page.url()).toContain("page=2");
      }
    }
  });

  test("primer página: botón prev deshabilitado", async ({ page }) => {
    await loginUI(page, "admin");

    // Navega a página 1
    await page.goto("/admin/empleados?page=1&pageSize=25");

    // Busca link prev (href con page=0, nunca seguible)
    const prevLink = page.locator('a[href*="page=0"]').first();

    // Si existe, verifica que no es clickeable o está deshabilitado
    if (await prevLink.isVisible().catch(() => false)) {
      // Verifica atributo aria-disabled
      await expect(prevLink).toHaveAttribute("aria-disabled", "true");
    }
  });

  test("mantiene queryParams al cambiar paginación", async ({ page }) => {
    await loginUI(page, "admin");

    // Navega con sort y order
    await page.goto(
      "/admin/empleados?page=1&pageSize=25&sort=nombre&order=asc"
    );

    // Cambia pageSize
    await page.locator("#page-size-select").selectOption("50");
    await page.waitForURL(/pageSize=50/);

    // Verifica que sort y order se mantienen
    expect(page.url()).toContain("sort=nombre");
    expect(page.url()).toContain("order=asc");
    expect(page.url()).toContain("pageSize=50");
  });
});
