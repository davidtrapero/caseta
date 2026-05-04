/*
  Warnings:

  - You are about to drop the column `fecha` on the `Turno` table. All the data in the column will be lost.
  - Added the required column `fechaFin` to the `Turno` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaInicio` to the `Turno` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Turno_casetaId_fecha_idx";

-- DropIndex
DROP INDEX "Turno_edicionId_fecha_idx";

-- DropIndex
DROP INDEX "Turno_empleadoId_fecha_key";

-- AlterTable
ALTER TABLE "Turno" DROP COLUMN "fecha",
ADD COLUMN     "fechaFin" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fechaInicio" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Turno_casetaId_fechaInicio_idx" ON "Turno"("casetaId", "fechaInicio");

-- CreateIndex
CREATE INDEX "Turno_empleadoId_fechaInicio_idx" ON "Turno"("empleadoId", "fechaInicio");

-- CreateIndex
CREATE INDEX "Turno_edicionId_fechaInicio_idx" ON "Turno"("edicionId", "fechaInicio");
