// Setup global de Vitest. Se ejecuta tras load-env.ts.
// Mocks de los módulos de Next que no tienen sentido en entorno Node:
//  - next/headers: devuelve la cookie que signInAs() inyecta.
//  - next/cache: no-op revalidatePath / revalidateTag.
//  - next/navigation: redirect lanza error REDIRECT:<url> para que los
//    tests puedan aserturar la redirección sin que Next intente navegar.
import { vi } from "vitest";
import { getTestCookie } from "./auth-helper";

vi.mock("next/headers", async () => {
  return {
    headers: async () => {
      const cookie = getTestCookie();
      return new Headers(cookie ? { cookie } : {});
    },
    cookies: async () => ({
      get: (_name: string) => undefined,
      getAll: () => [],
      set: () => {},
      delete: () => {},
    }),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: <T>(fn: T) => fn,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    // Next.js real lanza NEXT_REDIRECT. Lanzamos un Error reconocible
    // para que los tests puedan hacer `expect(() => ...).toThrow("REDIRECT:/caja")`.
    const err = new Error(`REDIRECT:${url}`);
    (err as { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw err;
  },
  notFound: () => {
    const err = new Error("NOT_FOUND");
    (err as { digest?: string }).digest = "NEXT_NOT_FOUND";
    throw err;
  },
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));
