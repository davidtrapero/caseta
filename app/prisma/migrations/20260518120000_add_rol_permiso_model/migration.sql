-- CreateTable
CREATE TABLE "rol_permiso" (
    "id" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "permiso" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rol_permiso_rol_permiso_key" ON "rol_permiso"("rol", "permiso");

-- CreateIndex
CREATE INDEX "rol_permiso_rol_idx" ON "rol_permiso"("rol");
