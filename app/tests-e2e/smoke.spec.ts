import { test, expect } from "@playwright/test";
import { loginUI, resetServerDb } from "./_helpers";

test.describe("Smoke", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    await resetServerDb(request, baseURL!);
  });

  test("login admin + crear edición aparece en listado", async ({ page }) => {
    await loginUI(page, "admin");
    expect(page.url()).not.toContain("/login");

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
