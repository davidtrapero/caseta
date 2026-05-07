import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * Entidades excluidas de la auditoría (técnicas o ruidosas).
 */
const ENTIDADES_EXCLUIDAS = new Set([
  "AuditLog",
  "Session",
  "Account",
  "Verification",
]);

/**
 * Extensión que escribe en AuditLog cada create/update/delete de cualquier entidad.
 *
 * Lee el usuarioId desde una variable async-local que se setea en cada Server Action
 * vía withAuditContext(userId, fn).
 */
import { AsyncLocalStorage } from "node:async_hooks";

const auditContext = new AsyncLocalStorage<{ usuarioId: string | null }>();

// AsyncLocalStorage.run() limpia el store automáticamente al finalizar fn().
// Asumimos entorno sin Worker Threads ni request pooling (Next.js serverless).
export function withAuditContext<T>(
  usuarioId: string | null,
  fn: () => Promise<T>
): Promise<T> {
  return auditContext.run({ usuarioId }, fn);
}

export function auditExtension(prisma: PrismaClient) {
  return prisma.$extends({
    name: "audit-log",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const isWrite = ["create", "update", "delete", "upsert"].includes(operation);
          if (!isWrite || !model || ENTIDADES_EXCLUIDAS.has(model)) {
            return query(args);
          }

          const result = await query(args);
          const ctx = auditContext.getStore();

          try {
            // Extrae ID del resultado si existe
            const entidadId =
              typeof result === "object" && result !== null && "id" in result
                ? String((result as { id: unknown }).id)
                : "?";

            await prisma.auditLog.create({
              data: {
                entidad: model,
                entidadId,
                accion: operation,
                usuarioId: ctx?.usuarioId ?? null,
                cambios: (args as Prisma.InputJsonValue) ?? {},
              },
            });
          } catch (error) {
            console.error("AuditLog fallo (silenciado):", error);
          }

          return result;
        },
      },
    },
  });
}
