import { defineConfig } from "vitest/config";
import tsconfigPaths from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // Carga env antes de importar cualquier módulo que exija DATABASE_URL,
    // y luego aplica los mocks globales de Next.
    setupFiles: ["./src/test/load-env.ts", "./src/test/vitest-setup.ts"],
    // BD única compartida entre workers → serializar para evitar race en TRUNCATE.
    // Si la suite crece mucho, migrar a branch-per-worker (coste: más $Neon).
    // En Vitest 4 poolOptions pasó a top-level y threads.singleThread fue
    // reemplazado por fileParallelism:false para serializar ejecución.
    fileParallelism: false,
    // Los tests integrados contra Neon pueden tardar algo; damos holgura.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Incluir tests también en app/ (vitest por defecto sólo mira test/)
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": tsconfigPaths.resolve(__dirname, "src"),
    },
  },
});
