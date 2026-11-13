import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export const { GET } = handlers;

// Las cuentas las crea un admin con auth.api.signUpEmail desde el servidor, que no pasa por
// esta ruta. Better Auth expone también /sign-up/email por HTTP y no hay opción para cerrar
// solo esa vía sin romper la llamada de servidor, así que se corta aquí.
export async function POST(request: Request): Promise<Response> {
  if (new URL(request.url).pathname.endsWith("/sign-up/email")) {
    return new Response(null, { status: 404 });
  }
  return handlers.POST(request);
}
