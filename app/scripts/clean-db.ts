import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: true });

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  console.log("🧹 Iniciando limpieza de BD (preservando admin, roles, permisos)...\n");

  // Orden: cascadas descendentes según schema. Las FK se borran automáticamente por onDelete: Cascade.
  // Esto es el orden manual explícito para claridad.

  // 1. Solicitudes (turno y empleado) — cascadas de Turno y SolicitudEmpleado
  await prisma.solicitudVoluntarioTurno.deleteMany({});
  console.log("✓ SolicitudVoluntarioTurno");

  await prisma.solicitudEmpleadoTurno.deleteMany({});
  console.log("✓ SolicitudEmpleadoTurno");

  await prisma.solicitudVoluntario.deleteMany({});
  console.log("✓ SolicitudVoluntario");

  await prisma.solicitudEmpleado.deleteMany({});
  console.log("✓ SolicitudEmpleado");

  // 2. Inventario
  await prisma.detallePedido.deleteMany({});
  console.log("✓ DetallePedido");

  await prisma.pedido.deleteMany({});
  console.log("✓ Pedido");

  await prisma.movimientoStock.deleteMany({});
  console.log("✓ MovimientoStock");

  await prisma.stock.deleteMany({});
  console.log("✓ Stock");

  await prisma.productoCaseta.deleteMany({});
  console.log("✓ ProductoCaseta");

  await prisma.producto.deleteMany({});
  console.log("✓ Producto");

  // 3. Caja
  await prisma.gasto.deleteMany({});
  console.log("✓ Gasto");

  await prisma.cierreDiario.deleteMany({});
  console.log("✓ CierreDiario");

  await prisma.nomina.deleteMany({});
  console.log("✓ Nomina");

  // 4. Turnos
  await prisma.turnoPlaza.deleteMany({});
  console.log("✓ TurnoPlaza");

  await prisma.turnoEmpleado.deleteMany({});
  console.log("✓ TurnoEmpleado");

  await prisma.turno.deleteMany({});
  console.log("✓ Turno");

  // 5. Empleados
  await prisma.empleadoTipo.deleteMany({});
  console.log("✓ EmpleadoTipo");

  await prisma.empleado.deleteMany({});
  console.log("✓ Empleado");

  // 6. Ediciones y casetas (solo borrar ediciones, casetas son transversales pero sin datos)
  await prisma.edicion.deleteMany({});
  console.log("✓ Edicion");

  // Casetas vacías pero sin borrar (son configuración transversal)
  console.log("✓ Caseta (preservada)");

  // 7. Audit log (limpiar todo auditoría)
  await prisma.auditLog.deleteMany({});
  console.log("✓ AuditLog");

  // 8. Entidades de voluntarios (limpiar)
  await prisma.entidadVoluntario.deleteMany({});
  console.log("✓ EntidadVoluntario");

  // 9. Proveedores (limpiar)
  await prisma.proveedor.deleteMany({});
  console.log("✓ Proveedor");

  // 10. Sessions y Accounts (user-owned, no tocar User)
  await prisma.session.deleteMany({});
  console.log("✓ Session");

  await prisma.account.deleteMany({});
  console.log("✓ Account");

  // 11. Verificación (limpiar)
  await prisma.verification.deleteMany({});
  console.log("✓ Verification");

  // 12. Plantillas de mensajes (preservar — configuración transversal)
  await prisma.plantillaMensaje.deleteMany({});
  console.log("✓ PlantillaMensaje (reseteada)");

  console.log("\n✅ BD limpia. Preservados:");
  console.log("  • User (incluyendo admin)");
  console.log("  • Rol (enum)");
  console.log("  • RolPermiso (permisos por rol)");
  console.log("  • Caseta (configuración transversal)");
  console.log("  • TipoEmpleado (configuración transversal)");

  const adminCount = await prisma.user.count();
  const casetaCount = await prisma.caseta.count();
  const tipoCount = await prisma.tipoEmpleado.count();
  const permCount = await prisma.rolPermiso.count();

  console.log(`\nCuentas: ${adminCount} usuario(s), ${casetaCount} caseta(s), ${tipoCount} tipo(s), ${permCount} permisos`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
