/*
  Warnings:

  - You are about to drop the `rol_permiso` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable (IF EXISTS para compatibilidad con ramas que no tienen esta tabla)
DROP TABLE IF EXISTS "rol_permiso";

-- CreateTable
CREATE TABLE "SolicitudEmpleado" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'pendiente',
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decididaAt" TIMESTAMP(3),
    "decididaPorUserId" TEXT,

    CONSTRAINT "SolicitudEmpleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudEmpleadoTurno" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "estado" "EstadoSolicitudTurno" NOT NULL DEFAULT 'pendiente',
    "motivoRechazo" TEXT,
    "decididaAt" TIMESTAMP(3),
    "decididaPorUserId" TEXT,

    CONSTRAINT "SolicitudEmpleadoTurno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolPermiso" (
    "id" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "permiso" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitudEmpleado_edicionId_estado_idx" ON "SolicitudEmpleado"("edicionId", "estado");

-- CreateIndex
CREATE INDEX "SolicitudEmpleado_dni_idx" ON "SolicitudEmpleado"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudEmpleado_edicionId_dni_key" ON "SolicitudEmpleado"("edicionId", "dni");

-- CreateIndex
CREATE INDEX "SolicitudEmpleadoTurno_turnoId_idx" ON "SolicitudEmpleadoTurno"("turnoId");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudEmpleadoTurno_solicitudId_turnoId_key" ON "SolicitudEmpleadoTurno"("solicitudId", "turnoId");

-- CreateIndex
CREATE INDEX "RolPermiso_rol_idx" ON "RolPermiso"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "RolPermiso_rol_permiso_key" ON "RolPermiso"("rol", "permiso");

-- AddForeignKey
ALTER TABLE "SolicitudEmpleado" ADD CONSTRAINT "SolicitudEmpleado_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "Edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudEmpleado" ADD CONSTRAINT "SolicitudEmpleado_decididaPorUserId_fkey" FOREIGN KEY ("decididaPorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudEmpleadoTurno" ADD CONSTRAINT "SolicitudEmpleadoTurno_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudEmpleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudEmpleadoTurno" ADD CONSTRAINT "SolicitudEmpleadoTurno_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudEmpleadoTurno" ADD CONSTRAINT "SolicitudEmpleadoTurno_decididaPorUserId_fkey" FOREIGN KEY ("decididaPorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
