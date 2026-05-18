/**
 * Catálogo centralizado de permisos granulares.
 * Usado por requirePermiso() en runtime y para construir la matriz editable en /admin/permisos.
 */

export const PERMISSIONS = {
  // =====================
  // Admin: gestión de usuarios y configuración
  // =====================
  "admin.usuarios.listar": "Ver listado de usuarios",
  "admin.usuarios.crear": "Crear nuevos usuarios",
  "admin.usuarios.editar": "Editar usuarios existentes",
  "admin.usuarios.eliminar": "Eliminar usuarios",
  "admin.usuarios.activar": "Activar/desactivar usuarios",

  // =====================
  // Admin: gestión de ediciones
  // =====================
  "admin.ediciones.listar": "Ver listado de ediciones",
  "admin.ediciones.crear": "Crear ediciones",
  "admin.ediciones.editar": "Editar ediciones",
  "admin.ediciones.eliminar": "Eliminar ediciones",
  "admin.ediciones.activar": "Activar edición actual",

  // =====================
  // Admin: gestión de catálogos
  // =====================
  "admin.casetas.crud": "Crear/editar/eliminar casetas",
  "admin.empleados.crud": "Crear/editar/eliminar empleados",
  "admin.tipos-empleado.crud": "Crear/editar/eliminar tipos de empleado",
  "admin.entidades.crud": "Crear/editar/eliminar entidades de voluntarios",
  "admin.proveedores.crud": "Crear/editar/eliminar proveedores",

  // =====================
  // Admin: configuración y permisos
  // =====================
  "admin.permisos.ver": "Ver matriz de permisos",
  "admin.permisos.editar": "Editar asignación de permisos por rol",
  "admin.ajustes.editar": "Editar ajustes generales",

  // =====================
  // Turnos: gestión completa
  // =====================
  "turnos.semana.ver": "Ver calendario semanal de turnos",
  "turnos.semana.crear": "Crear turnos",
  "turnos.semana.editar": "Editar turnos",
  "turnos.semana.eliminar": "Eliminar turnos",
  "turnos.asignaciones.editar": "Asignar/desasignar empleados",
  "turnos.asistencia.registrar": "Registrar asistencia",
  "turnos.asistencia.editar": "Editar asistencia",
  "turnos.imprimir": "Exportar/imprimir turnos",

  // =====================
  // Solicitudes de voluntarios
  // =====================
  "solicitudes.listar": "Ver solicitudes de voluntarios",
  "solicitudes.decidir": "Aprobar/rechazar solicitudes",
  "solicitudes.ver-detalles": "Ver detalles de solicitudes",

  // =====================
  // Caja: gestión de ingresos y gastos
  // =====================
  "caja.cierres.crear": "Crear cierres diarios",
  "caja.cierres.editar": "Editar cierres diarios",
  "caja.cierres.bloquear": "Bloquear/desbloquear cierres",
  "caja.cierres.ver": "Ver cierres diarios",
  "caja.gastos.crear": "Crear gastos",
  "caja.gastos.editar": "Editar gastos",
  "caja.gastos.eliminar": "Eliminar gastos",
  "caja.gastos.ver": "Ver gastos",
  "caja.nominas.crear": "Crear nóminas",
  "caja.nominas.editar": "Editar nóminas",
  "caja.nominas.marcar-pagada": "Marcar nóminas como pagadas",
  "caja.nominas.ver": "Ver nóminas",
  "caja.balance.ver": "Ver balance de edición",

  // =====================
  // Inventario: productos y pedidos
  // =====================
  "inventario.productos.crud": "Crear/editar/eliminar productos",
  "inventario.stock.ver": "Ver stock",
  "inventario.stock.ajustar": "Ajustar stock",
  "inventario.pedidos.crear": "Crear pedidos",
  "inventario.pedidos.editar": "Editar pedidos",
  "inventario.pedidos.recibir": "Marcar pedidos como recibidos",
  "inventario.pedidos.cancelar": "Cancelar pedidos",
  "inventario.pedidos.ver": "Ver pedidos",
  "inventario.movimientos.ver": "Ver historial de movimientos",
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Array ordenado de todos los permisos disponibles.
 */
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/**
 * Permiso por defecto para admin (tiene acceso a todo).
 * Retorna el conjunto completo de permisos.
 */
export function getAdminPermissions(): Set<Permission> {
  return new Set(ALL_PERMISSIONS);
}

/**
 * Permisos por defecto para cada rol (base inicial).
 * Estos pueden editarse dinámicamente en /admin/permisos.
 */
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<"admin" | "gerente" | "cajero", Permission[]> = {
  admin: ALL_PERMISSIONS, // Admin tiene todos

  gerente: [
    // Turnos completo
    "turnos.semana.ver",
    "turnos.semana.crear",
    "turnos.semana.editar",
    "turnos.semana.eliminar",
    "turnos.asignaciones.editar",
    "turnos.asistencia.registrar",
    "turnos.asistencia.editar",
    "turnos.imprimir",
    // Solicitudes
    "solicitudes.listar",
    "solicitudes.decidir",
    "solicitudes.ver-detalles",
    // Caja: ver y crear cierres, ver gastos, ver nóminas, ver balance
    "caja.cierres.crear",
    "caja.cierres.editar",
    "caja.cierres.ver",
    "caja.gastos.crear",
    "caja.gastos.ver",
    "caja.nominas.ver",
    "caja.balance.ver",
    // Inventario: ver stock y pedidos completo
    "inventario.productos.crud",
    "inventario.stock.ver",
    "inventario.stock.ajustar",
    "inventario.pedidos.crear",
    "inventario.pedidos.editar",
    "inventario.pedidos.recibir",
    "inventario.pedidos.ver",
    "inventario.movimientos.ver",
    // Admin: solo ver empleados y catálogos
    "admin.empleados.crud",
    "admin.casetas.crud",
  ],

  cajero: [
    // Caja: crear y editar cierres, crear gastos
    "caja.cierres.crear",
    "caja.cierres.editar",
    "caja.cierres.ver",
    "caja.gastos.crear",
    "caja.gastos.ver",
    // Turnos: solo ver
    "turnos.semana.ver",
    "turnos.asistencia.registrar",
    // Inventario: solo ver stock
    "inventario.stock.ver",
    "inventario.pedidos.ver",
    "inventario.productos.crud",
  ],
};
