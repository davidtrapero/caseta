import { test, expect } from "@playwright/test";
import { loginUI, resetServerDb } from "../_helpers";

test.describe("Inventario: producto y stock", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    await resetServerDb(request, baseURL!);
  });

  test("crear producto + ajustar stock → movimiento registrado", async ({
    page,
  }) => {
    await loginUI(page, "admin");

    // Crear producto.
    await page.goto("/inventario/productos/nuevo");
    await page.getByLabel(/caseta/i).selectOption({ label: "Caseta Test" });
    await page.getByLabel(/nombre/i).fill("Cerveza test");
    await page.getByRole("button", { name: /crear/i }).click();
    await page.waitForURL(/\/inventario\/productos$/);
    await expect(page.getByText("Cerveza test")).toBeVisible();

    // Ajustar stock.
    await page.goto("/inventario/stock");
    await page.getByRole("button", { name: /ajustar/i }).first().click();
    await page.getByLabel(/nueva cantidad/i).fill("10");
    await page.getByRole("button", { name: /guardar ajuste/i }).click();

    // Verificar movimiento.
    await page.goto("/inventario/movimientos");
    await expect(page.getByText("Cerveza test")).toBeVisible();
    // Con la diferencia +10 (stock nuevo 10 − anterior 0).
    await expect(page.getByText(/\+10/)).toBeVisible();
  });
});
