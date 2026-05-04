-- Fase 3: un Turno puede tener 0..N empleados (antes 1:1).
-- 1. Nueva tabla TurnoEmpleado.
-- 2. Migrar datos existentes: por cada Turno actual, crear fila TurnoEmpleado (turnoId, empleadoId, asistio).
-- 3. Drop FK + columnas + índice antiguos en Turno.

CREATE TABLE "TurnoEmpleado" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "asistio" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurnoEmpleado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TurnoEmpleado_turnoId_empleadoId_key" ON "TurnoEmpleado"("turnoId", "empleadoId");
CREATE INDEX "TurnoEmpleado_empleadoId_idx" ON "TurnoEmpleado"("empleadoId");

ALTER TABLE "TurnoEmpleado"
  ADD CONSTRAINT "TurnoEmpleado_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TurnoEmpleado_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: cada Turno existente (1:1) pasa a una asignación. cuid v1-ish generado con concatenación simple.
INSERT INTO "TurnoEmpleado" ("id", "turnoId", "empleadoId", "asistio", "createdAt")
SELECT
  'mig_' || substr(md5(random()::text || t."id"), 1, 20),
  t."id",
  t."empleadoId",
  t."asistio",
  t."createdAt"
FROM "Turno" t;

-- Drop constraints / index antiguos en Turno.
ALTER TABLE "Turno" DROP CONSTRAINT "Turno_empleadoId_fkey";
DROP INDEX "Turno_empleadoId_fechaInicio_idx";
ALTER TABLE "Turno" DROP COLUMN "empleadoId";
ALTER TABLE "Turno" DROP COLUMN "asistio";
