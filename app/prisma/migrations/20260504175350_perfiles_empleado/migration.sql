-- CreateEnum
CREATE TYPE "PerfilEmpleado" AS ENUM ('vigilante', 'coordinador', 'trabajador', 'voluntario', 'ayudante');

-- AlterTable
ALTER TABLE "Empleado" ADD COLUMN     "perfil" "PerfilEmpleado" NOT NULL DEFAULT 'trabajador';

-- CreateTable
CREATE TABLE "TurnoPlaza" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "perfil" "PerfilEmpleado" NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "TurnoPlaza_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TurnoPlaza_turnoId_perfil_key" ON "TurnoPlaza"("turnoId", "perfil");

-- AddForeignKey
ALTER TABLE "TurnoPlaza" ADD CONSTRAINT "TurnoPlaza_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
