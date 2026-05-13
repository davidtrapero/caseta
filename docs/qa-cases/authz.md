# Casos QA — Authorization (rol × ruta)

Cobertura: matriz de visibilidad y permisos por rol. El middleware solo valida cookie; el control real lo hace `requireRole()` en server actions y el render condicional en UI.

Roles: `admin` (CRUD total), `gerente` (operativa diaria, sin nóminas/usuarios), `cajero` (cierres y gastos; resto solo lectura).

---

### CASO-AUTHZ-001: Cajero ve listado de ediciones pero NO botón de crear

**Rol**: cajero
**Pasos**:
1. Login como cajero
2. Navegar a `/admin/ediciones`

**Aserciones**:
- Heading "Ediciones" visible
- NO existe link/botón "Nueva edición"

---

### CASO-AUTHZ-002: Cajero NO puede acceder a formulario de nuevo producto

**Rol**: cajero
**Pasos**:
1. Login como cajero
2. Navegar a `/inventario/productos/nuevo`

**Aserciones**:
- NO se renderiza botón "Crear producto"
- O bien la página redirige a una vista de solo lectura

---

### CASO-AUTHZ-003: Gerente NO ve sección de Nóminas

**Rol**: gerente
**Pasos**:
1. Login como gerente
2. Navegar a `/caja/nominas`

**Aserciones**:
- O bien hay redirect/403, o bien el contenido sensible (totales, controles de cálculo) no está
- Verificar también que en el sidebar lateral no aparece el link "Nóminas" para gerente

---

### CASO-AUTHZ-004: Gerente NO ve sección de Usuarios

**Rol**: gerente
**Pasos**:
1. Login como gerente
2. Intentar navegar a `/admin/usuarios`

**Aserciones**:
- No se ve listado de usuarios, o aparece mensaje de permisos

---

### CASO-AUTHZ-005: Admin ve todas las secciones del sidebar

**Rol**: admin
**Pasos**:
1. Login como admin
2. `browser_snapshot` de la home

**Aserciones**:
- Sidebar lateral incluye al menos: Dashboard, Turnos, Caja, Inventario, Admin (con sus subsecciones)
- Visible link a "Empleados", "Usuarios", "Ediciones", "Casetas", "Nóminas"

---

### CASO-AUTHZ-006: Cajero puede crear cierre diario

**Rol**: cajero
**Pasos**:
1. Login como cajero
2. Navegar a `/caja/cierres/nuevo`

**Aserciones**:
- Formulario de cierre visible y editable
- Botón "Crear" / "Guardar" presente

---

### CASO-AUTHZ-007: Cajero NO puede bloquear un cierre

**Rol**: cajero
**Precondición**: Necesita un cierre creado previamente. Crear uno como admin antes (vía UI) o asumir que el caso se ejecuta tras CASO-CAJA-002.
**Pasos**:
1. Login como cajero
2. Navegar a `/caja/cierres`
3. Abrir el cierre existente

**Aserciones**:
- NO existe botón "Bloquear" para cajero
