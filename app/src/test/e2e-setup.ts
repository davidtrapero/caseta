// Global setup de Playwright: carga env, limpia BD y siembra datos mínimos
// una vez antes de toda la suite. Entre specs, cada test usa endpoint
// /api/test-reset para volver al estado limpio.
import "./load-env";
import { resetDb } from "./db-reset";
import { seedMinimal } from "./fixtures";

export default async function globalSetup() {
  console.log("[e2e] Reseteando BD de test…");
  await resetDb();
  console.log("[e2e] Sembrando datos mínimos…");
  await seedMinimal();
  console.log("[e2e] Listo.");
}
