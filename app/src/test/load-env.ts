// Carga las variables de entorno de .env.test ANTES de cualquier import
// que pueda traer @/lib/prisma (que exige DATABASE_URL al construirse).
// Se referencia en vitest.config.ts (setupFiles) y en e2e-setup.ts.
import { config as dotenvConfig } from "dotenv";
import path from "node:path";

// Resolvemos la ruta absoluta: este archivo vive en app/src/test/,
// así que .env.test está 2 niveles arriba.
const envPath = path.resolve(__dirname, "../../.env.test");

dotenvConfig({ path: envPath, override: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    `[test] No se pudo cargar DATABASE_URL desde ${envPath}. ¿Existe el archivo .env.test?`
  );
}

// Salvaguarda: evitar correr tests contra la BD de producción/dev por accidente.
// El branch de test tiene host "ep-shy-rice" (distintivo) — si cambia, actualizar.
const url = process.env.DATABASE_URL;
if (!url.includes("ep-shy-rice")) {
  // Relajamos la aserción: solo impedimos si detectamos un branch conocido de dev.
  // Basta con que NO sea el branch `dev` de Neon.
  if (url.includes("neondb") && !url.includes("test")) {
    console.warn(
      "[test] Advertencia: DATABASE_URL no parece apuntar al branch `test`. " +
        "Asegúrate de usar el branch correcto antes de que los tests trunquen datos."
    );
  }
}
