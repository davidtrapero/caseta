// Helpers de autenticación para tests.
//
// - signInAs(rol|email): crea programáticamente una sesión en la tabla
//   Session de Better Auth y devuelve la cookie. Para Vitest, el
//   vitest-setup.ts mockea next/headers para devolver esta cookie.
//
// - loginUI(page, rol): Playwright. Hace login real vía UI usando las
//   credenciales de seedMinimal(). Más lento pero inmune a cambios de
//   API interna de Better Auth.
import { prisma } from "@/lib/prisma";
import { TEST_PASSWORD } from "./fixtures";

// Estado del mock: el valor que devolverá headers() cuando un test
// llame a getSession(). Se actualiza vía setTestCookie/clearTestCookie.
let cookieActiva: string | null = null;

export function getTestCookie(): string | null {
  return cookieActiva;
}

export function clearTestCookie(): void {
  cookieActiva = null;
}

/**
 * Crea una sesión viva en BD para un usuario ya existente.
 * Devuelve la cookie que los tests deben inyectar en headers().
 *
 * Requiere que el usuario exista (seedMinimal o crearUsuario).
 */
export async function signInAs(
  rolOrEmail: "admin" | "gerente" | "cajero" | string
): Promise<{ userId: string; cookieHeader: string }> {
  const email = rolOrEmail.includes("@")
    ? rolOrEmail
    : `${rolOrEmail}@caseta.test`;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(
      `[test] Usuario ${email} no existe. ¿Ejecutaste seedMinimal() antes?`
    );
  }

  // Better Auth espera un token con formato concreto: <id>.<signature>
  // Para evitar reimplementar la firma HMAC, pedimos a la propia API
  // que firme la sesión haciendo un sign-in real vía HTTP interno.
  const { auth } = await import("@/lib/auth");
  const response = await auth.api.signInEmail({
    body: { email, password: TEST_PASSWORD },
    asResponse: true,
  });

  // Extraer la cookie de Set-Cookie.
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("[test] signInEmail no devolvió Set-Cookie");
  }

  // Convertir "name=value; Path=/..." en "name=value" para reenviar en Cookie header.
  const cookiePairs = setCookie
    .split(/,\s*(?=[^;]+=[^;]+)/) // separa cookies múltiples sin romper atributos
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  cookieActiva = cookiePairs;
  return { userId: user.id, cookieHeader: cookiePairs };
}

/**
 * Helper Playwright: hace login real vía formulario.
 * Importar sólo desde tests Playwright (no desde Vitest).
 */
export async function loginUI(
  page: import("@playwright/test").Page,
  rolOrEmail: "admin" | "gerente" | "cajero" | string = "admin",
  password: string = TEST_PASSWORD
): Promise<void> {
  const email = rolOrEmail.includes("@")
    ? rolOrEmail
    : `${rolOrEmail}@caseta.test`;

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/contraseña|password/i).fill(password);
  await page.getByRole("button", { name: /entrar|iniciar|login/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 10_000,
  });
}
