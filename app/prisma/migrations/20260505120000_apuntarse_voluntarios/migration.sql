-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('pendiente', 'aprobada', 'rechazada', 'cancelada');

-- AlterTable: formularioToken en Edicion
ALTER TABLE "Edicion" ADD COLUMN "formularioToken" TEXT;

-- AlterTable: entidadId en Empleado
ALTER TABLE "Empleado" ADD COLUMN "entidadId" TEXT;

-- CreateTable: EntidadVoluntario
CREATE TABLE "EntidadVoluntario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntidadVoluntario_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SolicitudVoluntario
CREATE TABLE "SolicitudVoluntario" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "observaciones" TEXT,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decididaAt" TIMESTAMP(3),
    "decididaPorUserId" TEXT,

    CONSTRAINT "SolicitudVoluntario_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SolicitudVoluntarioTurno
CREATE TABLE "SolicitudVoluntarioTurno" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,

    CONSTRAINT "SolicitudVoluntarioTurno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: EntidadVoluntario unique nombre
CREATE UNIQUE INDEX "EntidadVoluntario_nombre_key" ON "EntidadVoluntario"("nombre");

-- CreateIndex: EntidadVoluntario activa+nombre
CREATE INDEX "EntidadVoluntario_activa_nombre_idx" ON "EntidadVoluntario"("activa", "nombre");

-- CreateIndex: Edicion formularioToken unique
CREATE UNIQUE INDEX "Edicion_formularioToken_key" ON "Edicion"("formularioToken");

-- CreateIndex: SolicitudVoluntario edicionId+estado
CREATE INDEX "SolicitudVoluntario_edicionId_estado_idx" ON "SolicitudVoluntario"("edicionId", "estado");

-- CreateIndex: SolicitudVoluntario telefono
CREATE INDEX "SolicitudVoluntario_telefono_idx" ON "SolicitudVoluntario"("telefono");

-- CreateIndex: SolicitudVoluntario entidadId
CREATE INDEX "SolicitudVoluntario_entidadId_idx" ON "SolicitudVoluntario"("entidadId");

-- CreateIndex: SolicitudVoluntarioTurno unique solicitudId+turnoId
CREATE UNIQUE INDEX "SolicitudVoluntarioTurno_solicitudId_turnoId_key" ON "SolicitudVoluntarioTurno"("solicitudId", "turnoId");

-- CreateIndex: SolicitudVoluntarioTurno turnoId
CREATE INDEX "SolicitudVoluntarioTurno_turnoId_idx" ON "SolicitudVoluntarioTurno"("turnoId");

-- AddForeignKey: Empleado.entidadId -> EntidadVoluntario
ALTER TABLE "Empleado" ADD CONSTRAINT "Empleado_entidadId_fkey"
  FOREIGN KEY ("entidadId") REFERENCES "EntidadVoluntario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: SolicitudVoluntario.edicionId -> Edicion
ALTER TABLE "SolicitudVoluntario" ADD CONSTRAINT "SolicitudVoluntario_edicionId_fkey"
  FOREIGN KEY ("edicionId") REFERENCES "Edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: SolicitudVoluntario.entidadId -> EntidadVoluntario
ALTER TABLE "SolicitudVoluntario" ADD CONSTRAINT "SolicitudVoluntario_entidadId_fkey"
  FOREIGN KEY ("entidadId") REFERENCES "EntidadVoluntario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: SolicitudVoluntario.decididaPorUserId -> user
ALTER TABLE "SolicitudVoluntario" ADD CONSTRAINT "SolicitudVoluntario_decididaPorUserId_fkey"
  FOREIGN KEY ("decididaPorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: SolicitudVoluntarioTurno.solicitudId -> SolicitudVoluntario
ALTER TABLE "SolicitudVoluntarioTurno" ADD CONSTRAINT "SolicitudVoluntarioTurno_solicitudId_fkey"
  FOREIGN KEY ("solicitudId") REFERENCES "SolicitudVoluntario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: SolicitudVoluntarioTurno.turnoId -> Turno
ALTER TABLE "SolicitudVoluntarioTurno" ADD CONSTRAINT "SolicitudVoluntarioTurno_turnoId_fkey"
  FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: insertar entidad "Sin asignar" con id fijo para referencias FK.
-- Debe existir ANTES del UPDATE de empleados para no violar la FK constraint.
INSERT INTO "EntidadVoluntario" ("id", "nombre", "activa", "createdAt", "updatedAt")
VALUES ('cuid_sin_asignar_000000000001', 'Sin asignar', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Backfill: asignar entidad "Sin asignar" a voluntarios sin entidadId.
UPDATE "Empleado"
SET "entidadId" = 'cuid_sin_asignar_000000000001'
WHERE perfil = 'voluntario' AND "entidadId" IS NULL;

-- Índice parcial único: un teléfono solo puede aparecer una vez entre voluntarios activos.
-- Prisma no soporta índices parciales declarativos — se añade aquí manualmente.
CREATE UNIQUE INDEX "Empleado_telefono_voluntario_uniq"
  ON "Empleado" ("telefono")
  WHERE perfil = 'voluntario' AND telefono IS NOT NULL;
