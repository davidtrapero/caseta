import { test, expect } from "@playwright/test";
import { loginUI, resetServerDb } from "./_helpers";

test.describe("Caja: cierres y balance", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    await resetServerDb(request, baseURL!);
  });

  test("registrar cierre diario → aparece en balance", async ({ page }) => {
    await loginUI(page, "admin");
    await page.goto("/caja/cierres/nuevo");

    // Seleccionar la caseta sembrada por seedMinimal.
    const casetaSelect = page.getByLabel(/caseta/i);
    await casetaSelect.selectOption({ label: "Caseta Test" });
    await page.getByLabel(/fecha/i).fill("2026-05-02");
    await page.getByLabel(/ingresos/i).fill("500");
    await page.getByRole("button", { name: /crear|guardar/i }).click();

    await page.waitForURL(/\/caja\/cierres$/);

    // Navegar a balance y verificar fila.
    await page.goto("/caja/balance");
    await expect(page.getByText(/500/)).toBeVisible();
    await expect(page.getByText("Caseta Test").first()).toBeVisible();
  });
});
