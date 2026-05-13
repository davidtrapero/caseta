-- Migración: enum PerfilEmpleado → tabla TipoEmpleado.
-- Pasos:
--   1. Crear tabla TipoEmpleado.
--   2. Seed inicial con los 5 tipos preexistentes (slug = mismo valor del enum).
--   3. Añadir columnas FK nullable a Empleado / TurnoPlaza / Caseta.
--   4. Backfill mapeando slug ↔ enum antiguo.
--   5. NOT NULL en Empleado.tipoEmpleadoId y TurnoPlaza.tipoEmpleadoId.
--   6. FKs + índices nuevos.
--   7. Drop unique antiguo de TurnoPlaza, recrear el nuevo.
--   8. Drop columnas perfil / perfilDefecto.
--   9. Drop type PerfilEmpleado.

-- 1. Crear tabla TipoEmpleado.
CREATE TABLE "TipoEmpleado" (
  "id"           TEXT PRIMARY KEY,
  "slug"         TEXT NOT NULL,
  "label"        TEXT NOT NULL,
  "labelCorto"   TEXT NOT NULL,
  "colorHex"     TEXT NOT NULL,
  "orden"        INTEGER NOT NULL DEFAULT 0,
  "esVoluntario" BOOLEAN NOT NULL DEFAULT false,
  "activo"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "TipoEmpleado_slug_key" ON "TipoEmpleado"("slug");
CREATE INDEX "TipoEmpleado_orden_idx" ON "TipoEmpleado"("orden");

-- 2. Seed inicial. Colores derivados del HSL borde de perfiles.ts L41-70:
--    vigilante     hsl(3 52% 38%)   → #931f1c (granate)
--    coordinador   hsl(33 55% 35%)  → #8a6128 (latón oscuro)
--    trabajador    hsl(33 57% 50%)  → #c88536 (albero)
--    voluntario    hsl(78 38% 40%)  → #7a8e3f (oliva)
--    ayudante      hsl(38 30% 55%)  → #a8916a (arena)
INSERT INTO "TipoEmpleado" ("id", "slug", "label", "labelCorto", "colorHex", "orden", "esVoluntario", "activo", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'vigilante',   'Vigilante',   'Vig',  '#931f1c', 1, false, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'coordinador', 'Coordinador', 'Coor', '#8a6128', 2, false, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'trabajador',  'Trabajador',  'Trab', '#c88536', 3, false, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'voluntario',  'Voluntario',  'Vol',  '#7a8e3f', 4, true,  true, NOW(), NOW()),
  (gen_random_uuid()::text, 'ayudante',    'Ayudante',    'Ay',   '#a8916a', 5, false, true, NOW(), NOW());

-- 3. Añadir columnas FK nullable.
ALTER TABLE "Empleado"   ADD COLUMN "tipoEmpleadoId" TEXT;
ALTER TABLE "TurnoPlaza" ADD COLUMN "tipoEmpleadoId" TEXT;
ALTER TABLE "Caseta"     ADD COLUMN "tipoEmpleadoDefectoId" TEXT;

-- 4. Backfill por slug.
UPDATE "Empleado" e SET "tipoEmpleadoId" = t."id"
  FROM "TipoEmpleado" t WHERE t."slug" = e."perfil"::text;

UPDATE "TurnoPlaza" p SET "tipoEmpleadoId" = t."id"
  FROM "TipoEmpleado" t WHERE t."slug" = p."perfil"::text;

UPDATE "Caseta" c SET "tipoEmpleadoDefectoId" = t."id"
  FROM "TipoEmpleado" t WHERE c."perfilDefecto" IS NOT NULL AND t."slug" = c."perfilDefecto"::text;

-- 5. NOT NULL.
ALTER TABLE "Empleado"   ALTER COLUMN "tipoEmpleadoId" SET NOT NULL;
ALTER TABLE "TurnoPlaza" ALTER COLUMN "tipoEmpleadoId" SET NOT NULL;

-- 6. FKs + índices.
ALTER TABLE "Empleado"
  ADD CONSTRAINT "Empleado_tipoEmpleadoId_fkey"
  FOREIGN KEY ("tipoEmpleadoId") REFERENCES "TipoEmpleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Empleado_tipoEmpleadoId_idx" ON "Empleado"("tipoEmpleadoId");

ALTER TABLE "TurnoPlaza"
  ADD CONSTRAINT "TurnoPlaza_tipoEmpleadoId_fkey"
  FOREIGN KEY ("tipoEmpleadoId") REFERENCES "TipoEmpleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "TurnoPlaza_tipoEmpleadoId_idx" ON "TurnoPlaza"("tipoEmpleadoId");

ALTER TABLE "Caseta"
  ADD CONSTRAINT "Caseta_tipoEmpleadoDefectoId_fkey"
  FOREIGN KEY ("tipoEmpleadoDefectoId") REFERENCES "TipoEmpleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Drop unique antiguo de TurnoPlaza, crear nuevo.
DROP INDEX "TurnoPlaza_turnoId_perfil_key";
CREATE UNIQUE INDEX "TurnoPlaza_turnoId_tipoEmpleadoId_key" ON "TurnoPlaza"("turnoId", "tipoEmpleadoId");

-- 8. Drop columnas antiguas.
ALTER TABLE "Empleado"   DROP COLUMN "perfil";
ALTER TABLE "TurnoPlaza" DROP COLUMN "perfil";
ALTER TABLE "Caseta"     DROP COLUMN "perfilDefecto";

-- 9. Drop type.
DROP TYPE "PerfilEmpleado";
