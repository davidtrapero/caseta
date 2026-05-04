import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  // Registro deshabilitado: las cuentas las crea un admin manualmente.
  advanced: {
    database: {
      generateId: false,
    },
  },
  user: {
    additionalFields: {
      rol: {
        type: "string",
        required: false,
        defaultValue: "cajero",
        input: false, // no aceptar rol desde el cliente
      },
      activo: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // refresh cada 24h
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache de sesión en cookie
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
