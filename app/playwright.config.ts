import { defineConfig, devices } from "@playwright/test";
import { config as dotenvConfig } from "dotenv";
import path from "node:path";

// Cargar .env.test en el proceso Playwright para propagar DATABASE_URL y
// el secret al webServer vía `env:` (Next dev no lee .env.test automáticamente).
dotenvConfig({ path: path.resolve(__dirname, ".env.test"), override: true });

const PORT = 3100;

export default defineConfig({
  testDir: "./tests-e2e",
  // Serializar: Next dev + BD única no soportan paralelismo por defecto.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Los tests levantan el dev server de Next, que tarda en arrancar
  // especialmente en Windows corporativo.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  globalSetup: path.resolve(__dirname, "./src/test/e2e-setup.ts"),

  webServer: {
    // Next dev fuerza NODE_ENV=development: no podemos "ponerlo a test".
    // En su lugar usamos ENABLE_TEST_ENDPOINTS=true como guard del /api/test-reset.
    // También reenviamos DATABASE_URL y BETTER_AUTH_SECRET desde .env.test cargado arriba.
    command: `next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ENABLE_TEST_ENDPOINTS: "true",
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
