-- Migración: reemplazar IDs UUID de TipoEmpleado por cuids v1.
--
-- Motivo: la migración 20260508120000_tipo_empleado sembró los registros de
-- TipoEmpleado usando gen_random_uuid()::text, generando IDs de 36 chars en
-- formato UUID. El schema Prisma declara `id String @id @default(cuid())` y
-- todos los Zod schemas validan tipoEmpleadoId con `z.string().cuid()`. Como
-- consecuencia, crear o editar un turno con plazas > 0 falla con "Revisa los
-- campos marcados" porque Zod rechaza el formato UUID.
--
-- Esta migración:
--   1. Genera un cuid v1 nuevo para cada TipoEmpleado cuyo id no cumpla la
--      heurística de cuid (no empiece por 'c' o longitud != 25).
--   2. Inserta nuevas filas TipoEmpleado clonadas con el cuid nuevo.
--   3. Repunta las FKs (Empleado, TurnoPlaza, Caseta) al nuevo id.
--   4. Borra las filas viejas con UUID.
--   5. Verifica que no quedan IDs no-cuid.
--
-- Las FKs son ON DELETE RESTRICT, por eso clonamos primero y borramos al final.

-- Función local para generar cuid v1 (25 chars: 'c' + 8 ts + 4 counter + 4 fingerprint + 8 random, todo base36).
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

-- Mapeo old_id → new_id para los TipoEmpleado que necesitan reemplazo.
CREATE TEMP TABLE _tipo_empleado_id_map (
  old_id TEXT PRIMARY KEY,
  new_id TEXT NOT NULL UNIQUE
);

INSERT INTO _tipo_empleado_id_map (old_id, new_id)
SELECT t."id", pg_temp.gen_cuid()
FROM "TipoEmpleado" t
WHERE t."id" !~ '^c[a-z0-9]{24}$';

-- 1. Clonar filas con el nuevo cuid.
INSERT INTO "TipoEmpleado" ("id", "slug", "label", "labelCorto", "colorHex", "orden", "esVoluntario", "activo", "createdAt", "updatedAt")
SELECT m.new_id, t."slug" || '__migrating__' || m.new_id, t."label", t."labelCorto", t."colorHex", t."orden", t."esVoluntario", t."activo", t."createdAt", t."updatedAt"
FROM "TipoEmpleado" t
JOIN _tipo_empleado_id_map m ON m.old_id = t."id";

-- 2. Repuntar FKs al nuevo id.
UPDATE "Empleado" e
SET "tipoEmpleadoId" = m.new_id
FROM _tipo_empleado_id_map m
WHERE e."tipoEmpleadoId" = m.old_id;

UPDATE "TurnoPlaza" p
SET "tipoEmpleadoId" = m.new_id
FROM _tipo_empleado_id_map m
WHERE p."tipoEmpleadoId" = m.old_id;

UPDATE "Caseta" c
SET "tipoEmpleadoDefectoId" = m.new_id
FROM _tipo_empleado_id_map m
WHERE c."tipoEmpleadoDefectoId" = m.old_id;

-- 3. Borrar las filas viejas con UUID (ya nadie las referencia).
DELETE FROM "TipoEmpleado" t
USING _tipo_empleado_id_map m
WHERE t."id" = m.old_id;

-- 4. Restaurar el slug original (quitar el sufijo temporal).
UPDATE "TipoEmpleado" t
SET "slug" = SPLIT_PART(t."slug", '__migrating__', 1)
WHERE t."slug" LIKE '%\_\_migrating\_\_%' ESCAPE '\';

-- 5. Verificación: no deben quedar TipoEmpleado con id no-cuid.
DO $$
DECLARE
  malos INTEGER;
BEGIN
  SELECT COUNT(*) INTO malos FROM "TipoEmpleado" WHERE "id" !~ '^c[a-z0-9]{24}$';
  IF malos > 0 THEN
    RAISE EXCEPTION 'Quedan % TipoEmpleado con id no-cuid', malos;
  END IF;
END $$;

DROP TABLE _tipo_empleado_id_map;
