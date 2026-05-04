// Global setup de Playwright: carga env, limpia BD y siembra datos mínimos
// una vez antes de toda la suite. Entre specs, cada test usa endpoint
// /api/_test/reset para volver al estado limpio.
import "./load-env";

export default async function globalSetup() {
  const { resetDb } = await import("./db-reset");
  const { seedMinimal } = await import("./fixtures");

  console.log("[e2e] Reseteando BD de test…");
  await resetDb();
  console.log("[e2e] Sembrando datos mínimos…");
  await seedMinimal();
  console.log("[e2e] Listo.");
}
