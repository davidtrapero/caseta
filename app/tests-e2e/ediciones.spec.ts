import { test, expect } from "@playwright/test";
import { loginUI, resetServerDb } from "./_helpers";

test.describe("Ediciones", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    await resetServerDb(request, baseURL!);
  });

  test("admin crea una edición nueva y aparece en el listado", async ({ page }) => {
    await loginUI(page, "admin");
    await page.goto("/admin/ediciones/nueva");
    await page.getByLabel(/año/i).fill("2027");
    await page.getByLabel(/nombre/i).fill("Feria 2027");
    await page.getByLabel(/fecha inicio/i).fill("2027-05-01");
    await page.getByLabel(/fecha fin/i).fill("2027-05-10");
    await page.getByRole("button", { name: /crear/i }).click();

    await page.waitForURL(/\/admin\/ediciones$/);
    await expect(page.getByText("Feria 2027")).toBeVisible();
  });
});
