-- Migración: Producto pasa de 1:N a N:M con Caseta vía tabla pivote ProductoCaseta.
-- Orden garantizado para backfill seguro:
--   1. Crear tabla pivote
--   2. Backfill: insertar una fila por cada Producto actual (preservando casetaId y createdAt)
--   3. Añadir FKs a la tabla pivote
--   4. Eliminar FK, índice único y columna casetaId de Producto

-- 1. CreateTable
CREATE TABLE "ProductoCaseta" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "casetaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoCaseta_pkey" PRIMARY KEY ("id")
);

-- 2. Índices
CREATE UNIQUE INDEX "ProductoCaseta_productoId_casetaId_key" ON "ProductoCaseta"("productoId", "casetaId");
CREATE INDEX "ProductoCaseta_casetaId_idx" ON "ProductoCaseta"("casetaId");

-- 3. Backfill: cada Producto actual queda vinculado a su caseta original.
--    gen_random_uuid() disponible en Neon (sin pgcrypto explícito requerido).
INSERT INTO "ProductoCaseta" ("id", "productoId", "casetaId", "createdAt")
SELECT gen_random_uuid()::text, id, "casetaId", "createdAt"
FROM "Producto";

-- 4. AddForeignKey (sobre la tabla ya poblada)
ALTER TABLE "ProductoCaseta" ADD CONSTRAINT "ProductoCaseta_productoId_fkey"
    FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductoCaseta" ADD CONSTRAINT "ProductoCaseta_casetaId_fkey"
    FOREIGN KEY ("casetaId") REFERENCES "Caseta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. DropForeignKey en Producto
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_casetaId_fkey";

-- 6. DropIndex único (casetaId, nombre)
DROP INDEX "Producto_casetaId_nombre_key";

-- 7. DropColumn
ALTER TABLE "Producto" DROP COLUMN "casetaId";
