-- CreateTable
CREATE TABLE "plantilla_mensaje" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "asunto" TEXT,
    "cuerpo" TEXT NOT NULL,
    "descripcion" TEXT,
    "variables" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "plantilla_mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plantilla_mensaje_clave_key" ON "plantilla_mensaje"("clave");

-- AddForeignKey
ALTER TABLE "plantilla_mensaje" ADD CONSTRAINT "plantilla_mensaje_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
