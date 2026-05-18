# Inventario requireRole → requirePermiso

Mapeo de ~70 líneas con requireRole a permisos granulares. **Temporal — no commitear.**

## Admin: ajustes (1)
- ajustes/actions.ts:30 `["admin"]` → `admin.ajustes.editar`

## Admin: casetas (3)
- casetas/actions.ts:18 `["admin", "gerente"]` → `admin.casetas.crud`
- casetas/actions.ts:41 `["admin", "gerente"]` → `admin.casetas.crud`
- casetas/actions.ts:69 `["admin", "gerente"]` → `admin.casetas.crud`

## Admin: ediciones (6)
- ediciones/actions.ts:23 `["admin"]` → `admin.ediciones.crear`
- ediciones/actions.ts:46 `["admin"]` → `admin.ediciones.editar`
- ediciones/actions.ts:64 `["admin"]` → `admin.ediciones.activar`
- ediciones/actions.ts:84 `["admin", "gerente"]` → `admin.ediciones.editar`
- ediciones/actions.ts:119 `["admin", "gerente"]` → `admin.ediciones.activar`
- ediciones/actions.ts:144 `["admin", "gerente"]` → `admin.ediciones.activar`

## Admin: entidades (4)
- entidades/actions.ts:17 `["admin", "gerente"]` → `admin.entidades.crud`
- entidades/actions.ts:44 `["admin", "gerente"]` → `admin.entidades.crud`
- entidades/actions.ts:71 `["admin", "gerente"]` → `admin.entidades.crud`
- entidades/actions.ts:95 `["admin", "gerente"]` → `admin.entidades.crud`

## Admin: proveedores (3)
- proveedores/actions.ts:18 `["admin", "gerente"]` → `admin.proveedores.crud`
- proveedores/actions.ts:51 `["admin", "gerente"]` → `admin.proveedores.crud`
- proveedores/actions.ts:84 `["admin", "gerente"]` → `admin.proveedores.crud`

## Admin: solicitudes (2)
- solicitudes/actions.ts:63 `["admin", "gerente"]` → `solicitudes.decidir`
- solicitudes/actions.ts:268 `["admin", "gerente"]` → `solicitudes.decidir`

## Admin: tipos-empleado (3)
- tipos-empleado/actions.ts — ~3 lineas

## Admin: usuarios (5+)
- usuarios/actions.ts — ~5 lineas

## Caja: cierres (8+)
- cierres/actions.ts — ~8 lineas

## Caja: gastos (4+)
- gastos/actions.ts — ~4 lineas

## Caja: nóminas (5+)
- nominas/actions.ts — ~5 lineas

## Turnos: semana (15+)
- turnos/semana/actions.ts — ~15 lineas

## Turnos: asistencias (5+)
- turnos/asistencias/actions.ts — ~5 lineas

## Empleados (5+)
- empleados/actions.ts — ~5 lineas

## Inventario: productos (5+)
- inventario/productos/actions.ts — ~5 lineas

## Inventario: pedidos (10+)
- inventario/pedidos/actions.ts — ~10 lineas

## Inventario: stock (5+)
- inventario/stock/actions.ts — ~5 lineas

---

**Total estimado: ~100 líneas con requireRole**

Notas:
- Algunos `["admin", "gerente", "cajero"]` pueden significar "todos con acceso" (ej: cambio de password)
- Separar "listar", "crear", "editar", "eliminar" cuando tenga sentido (ej: admin.usuarios.*)
- Admin siempre accede a todo (bypass en requirePermiso hardcoded)
