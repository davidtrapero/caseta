-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('admin', 'gerente', 'cajero');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('entrada', 'ajuste');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('pendiente', 'recibido', 'cancelado');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'cajero',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Edicion" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Edicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caseta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ubicacion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caseta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT,
    "telefono" TEXT,
    "jornalDiario" DECIMAL(10,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "casetaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "asistio" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "casetaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'unidad',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "casetaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "casetaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "nota" TEXT,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "casetaId" TEXT NOT NULL,
    "fechaPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRecepcion" TIMESTAMP(3),
    "estado" "EstadoPedido" NOT NULL DEFAULT 'pendiente',
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetallePedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "DetallePedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CierreDiario" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "casetaId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "ingresosTotales" DECIMAL(12,2) NOT NULL,
    "notas" TEXT,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CierreDiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "casetaId" TEXT,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "categoria" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nomina" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "diasTrabajados" INTEGER NOT NULL,
    "jornalAplicado" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "fechaPago" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "usuarioId" TEXT,
    "cambios" JSONB NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Edicion_anio_key" ON "Edicion"("anio");

-- CreateIndex
CREATE UNIQUE INDEX "Caseta_nombre_key" ON "Caseta"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_dni_key" ON "Empleado"("dni");

-- CreateIndex
CREATE INDEX "Turno_casetaId_fecha_idx" ON "Turno"("casetaId", "fecha");

-- CreateIndex
CREATE INDEX "Turno_edicionId_fecha_idx" ON "Turno"("edicionId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Turno_empleadoId_fecha_key" ON "Turno"("empleadoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_casetaId_nombre_key" ON "Producto"("casetaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_casetaId_productoId_key" ON "Stock"("casetaId", "productoId");

-- CreateIndex
CREATE INDEX "MovimientoStock_casetaId_productoId_fecha_idx" ON "MovimientoStock"("casetaId", "productoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_nombre_key" ON "Proveedor"("nombre");

-- CreateIndex
CREATE INDEX "Pedido_estado_idx" ON "Pedido"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "CierreDiario_casetaId_edicionId_fecha_key" ON "CierreDiario"("casetaId", "edicionId", "fecha");

-- CreateIndex
CREATE INDEX "Gasto_edicionId_fecha_idx" ON "Gasto"("edicionId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Nomina_empleadoId_edicionId_key" ON "Nomina"("empleadoId", "edicionId");

-- CreateIndex
CREATE INDEX "AuditLog_entidad_entidadId_idx" ON "AuditLog"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "AuditLog_fecha_idx" ON "AuditLog"("fecha");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "Edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_casetaId_fkey" FOREIGN KEY ("casetaId") REFERENCES "Caseta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_casetaId_fkey" FOREIGN KEY ("casetaId") REFERENCES "Caseta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_casetaId_fkey" FOREIGN KEY ("casetaId") REFERENCES "Caseta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "Edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_casetaId_fkey" FOREIGN KEY ("casetaId") REFERENCES "Caseta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "Edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_casetaId_fkey" FOREIGN KEY ("casetaId") REFERENCES "Caseta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePedido" ADD CONSTRAINT "DetallePedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePedido" ADD CONSTRAINT "DetallePedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreDiario" ADD CONSTRAINT "CierreDiario_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "Edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreDiario" ADD CONSTRAINT "CierreDiario_casetaId_fkey" FOREIGN KEY ("casetaId") REFERENCES "Caseta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "Edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_casetaId_fkey" FOREIGN KEY ("casetaId") REFERENCES "Caseta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomina" ADD CONSTRAINT "Nomina_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "Edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomina" ADD CONSTRAINT "Nomina_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
