import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auditExtension } from "@/lib/audit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida en el entorno.");
}

// Sin límite, cada instancia serverless abre hasta 10 conexiones y agota las de Neon.
// En Vercel usar además el host -pooler en DATABASE_URL.
const adapter = new PrismaPg({ connectionString, max: 5, idleTimeoutMillis: 10_000 });

function createPrismaClient() {
  const base = new PrismaClient({ adapter });
  return auditExtension(base);
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

declare global {
  var prismaClient: ExtendedPrismaClient | undefined;
}

export const prisma = globalThis.prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = prisma;
}
