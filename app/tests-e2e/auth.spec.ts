import { test, expect } from "@playwright/test";
import { loginUI, resetServerDb } from "./_helpers";

test.describe("Autenticación", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    await resetServerDb(request, baseURL!);
  });

  test("login OK redirige fuera de /login", async ({ page }) => {
    await loginUI(page, "admin");
    expect(page.url()).not.toContain("/login");
  });

  test("login con password incorrecta muestra error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@caseta.test");
    await page.getByLabel("Contraseña").fill("password-incorrecto");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    expect(page.url()).toContain("/login");
  });
});
