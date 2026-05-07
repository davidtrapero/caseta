-- DropIndex
DROP INDEX "SolicitudVoluntario_telefono_idx";

-- AlterTable
ALTER TABLE "Caseta" ADD COLUMN     "jornalDiarioDefault" DECIMAL(10,2),
ADD COLUMN     "perfilDefecto" "PerfilEmpleado";

-- AlterTable
ALTER TABLE "SolicitudVoluntario" ADD COLUMN     "email" TEXT,
ADD COLUMN     "motivoRechazo" TEXT,
ALTER COLUMN "telefono" DROP NOT NULL;
