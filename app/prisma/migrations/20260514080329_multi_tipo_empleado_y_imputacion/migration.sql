-- Migración: N:M para tipos de empleado + tipoImputadoId en TurnoEmpleado.
--
-- Cambios:
--   1. Crea tabla EmpleadoTipo (N:M Empleado ↔ TipoEmpleado).
--   2. Backfill EmpleadoTipo con el tipo actual de cada empleado.
--   3. Añade esVoluntario a Empleado (derivado de jornalDiario IS NULL).
--   4. Añade tipoImputadoId a TurnoEmpleado con backfill desde Empleado.tipoEmpleadoId.
--   5. Elimina Empleado.tipoEmpleadoId (ya redundante).
--
-- El orden es crítico: los backfills se ejecutan ANTES de los DROP.

-- 0. Función gen_cuid (copia literal de 20260510120000_tipo_empleado_cuid_ids/migration.sql líneas 21-58)
CREATE OR REPLACE FUNCTION pg_temp.gen_cuid()
RETURNS TEXT AS $$
DECLARE
  ts_part      TEXT;
  counter_part TEXT;
  fp_part      TEXT;
  rnd_part     TEXT;
  ms           BIGINT;
  cnt          BIGINT;
BEGIN
  ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  -- Base36 del timestamp ms, padded a 8 chars (suficiente hasta el año ~4199).
  ts_part := LPAD(LOWER(TO_HEX(ms)), 8, '0');
  -- Trick: hex no es base36 puro, pero z.cuid() de Zod 4 acepta [a-z0-9]{24}
  -- detrás de la 'c'. Usamos hex (subset de base36) para mantener compatibilidad.
  IF LENGTH(ts_part) > 8 THEN
    ts_part := SUBSTRING(ts_part FROM LENGTH(ts_part) - 7);
  END IF;

  cnt := FLOOR(RANDOM() * 1679616)::BIGINT;  -- 36^4
  counter_part := LPAD(LOWER(TO_HEX(cnt)), 4, '0');
  IF LENGTH(counter_part) > 4 THEN
    counter_part := SUBSTRING(counter_part FROM LENGTH(counter_part) - 3);
  END IF;

  fp_part := LPAD(LOWER(TO_HEX(FLOOR(RANDOM() * 1679616)::BIGINT)), 4, '0');
  IF LENGTH(fp_part) > 4 THEN
    fp_part := SUBSTRING(fp_part FROM LENGTH(fp_part) - 3);
  END IF;

  rnd_part := LPAD(LOWER(TO_HEX(FLOOR(RANDOM() * 2821109907456)::BIGINT)), 8, '0');
  IF LENGTH(rnd_part) > 8 THEN
    rnd_part := SUBSTRING(rnd_part FROM LENGTH(rnd_part) - 7);
  END IF;

  RETURN 'c' || ts_part || counter_part || fp_part || rnd_part;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 1. Crear tabla EmpleadoTipo
CREATE TABLE "EmpleadoTipo" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "tipoEmpleadoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpleadoTipo_pkey" PRIMARY KEY ("id")
);

-- 2. Backfill EmpleadoTipo: cada empleado existente → fila con su tipo actual
INSERT INTO "EmpleadoTipo" ("id", "empleadoId", "tipoEmpleadoId", "createdAt")
SELECT pg_temp.gen_cuid(), e."id", e."tipoEmpleadoId", NOW()
FROM "Empleado" e
WHERE e."tipoEmpleadoId" IS NOT NULL;

-- 3. Añadir esVoluntario con backfill (jornalDiario IS NULL ⇒ voluntario)
ALTER TABLE "Empleado" ADD COLUMN "esVoluntario" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Empleado" SET "esVoluntario" = ("jornalDiario" IS NULL);

-- 4. Añadir tipoImputadoId a TurnoEmpleado con backfill mientras tipoEmpleadoId aún existe
ALTER TABLE "TurnoEmpleado" ADD COLUMN "tipoImputadoId" TEXT;
UPDATE "TurnoEmpleado" te
SET "tipoImputadoId" = e."tipoEmpleadoId"
FROM "Empleado" e
WHERE te."empleadoId" = e."id";
ALTER TABLE "TurnoEmpleado" ALTER COLUMN "tipoImputadoId" SET NOT NULL;

-- 5. Índices y constraints de EmpleadoTipo
CREATE INDEX "EmpleadoTipo_tipoEmpleadoId_idx" ON "EmpleadoTipo"("tipoEmpleadoId");
CREATE UNIQUE INDEX "EmpleadoTipo_empleadoId_tipoEmpleadoId_key" ON "EmpleadoTipo"("empleadoId", "tipoEmpleadoId");

-- 6. Índice de TurnoEmpleado.tipoImputadoId
CREATE INDEX "TurnoEmpleado_tipoImputadoId_idx" ON "TurnoEmpleado"("tipoImputadoId");

-- 7. FK TurnoEmpleado → TipoEmpleado (tipoImputado)
ALTER TABLE "TurnoEmpleado" ADD CONSTRAINT "TurnoEmpleado_tipoImputadoId_fkey" FOREIGN KEY ("tipoImputadoId") REFERENCES "TipoEmpleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. FKs de EmpleadoTipo
ALTER TABLE "EmpleadoTipo" ADD CONSTRAINT "EmpleadoTipo_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmpleadoTipo" ADD CONSTRAINT "EmpleadoTipo_tipoEmpleadoId_fkey" FOREIGN KEY ("tipoEmpleadoId") REFERENCES "TipoEmpleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 9. Solo AHORA: DROP del campo tipoEmpleadoId en Empleado (backfill ya hecho)
ALTER TABLE "Empleado" DROP CONSTRAINT "Empleado_tipoEmpleadoId_fkey";
DROP INDEX "Empleado_tipoEmpleadoId_idx";
ALTER TABLE "Empleado" DROP COLUMN "tipoEmpleadoId";
