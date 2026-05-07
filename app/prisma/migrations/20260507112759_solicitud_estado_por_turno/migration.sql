-- CreateEnum
CREATE TYPE "EstadoSolicitudTurno" AS ENUM ('pendiente', 'aprobado', 'rechazado');

-- AlterEnum
ALTER TYPE "EstadoSolicitud" ADD VALUE 'parcial';

-- AlterTable
ALTER TABLE "SolicitudVoluntarioTurno" ADD COLUMN     "decididaAt" TIMESTAMP(3),
ADD COLUMN     "decididaPorUserId" TEXT,
ADD COLUMN     "estado" "EstadoSolicitudTurno" NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "motivoRechazo" TEXT;

-- AddForeignKey
ALTER TABLE "SolicitudVoluntarioTurno" ADD CONSTRAINT "SolicitudVoluntarioTurno_decididaPorUserId_fkey" FOREIGN KEY ("decididaPorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: heredar estado de la solicitud padre para los hijos ya resueltos.
UPDATE "SolicitudVoluntarioTurno" t
SET "estado" = 'aprobado',
    "decididaAt" = s."decididaAt",
    "decididaPorUserId" = s."decididaPorUserId"
FROM "SolicitudVoluntario" s
WHERE t."solicitudId" = s.id AND s."estado" = 'aprobada';

UPDATE "SolicitudVoluntarioTurno" t
SET "estado" = 'rechazado',
    "motivoRechazo" = s."motivoRechazo",
    "decididaAt" = s."decididaAt",
    "decididaPorUserId" = s."decididaPorUserId"
FROM "SolicitudVoluntario" s
WHERE t."solicitudId" = s.id AND s."estado" = 'rechazada';
