import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auditExtension } from "@/lib/audit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida en el entorno.");
}

const adapter = new PrismaPg({ connectionString });

function createPrismaClient() {
  const base = new PrismaClient({ adapter });
  return auditExtension(base);
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

declare global {
  // eslint-disable-next-line no-var
  var prismaClient: ExtendedPrismaClient | undefined;
}

export const prisma = globalThis.prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = prisma;
}
