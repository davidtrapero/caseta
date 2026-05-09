# Casos QA — Admin

Cobertura: CRUD de ediciones, casetas, empleados, usuarios, proveedores, tipos de empleado, entidades.

---

### CASO-ADMIN-001: Crear edición nueva

**Rol**: admin
**Pasos**:
1. Login como admin
2. Navegar a `/admin/ediciones/nueva`
3. Año = 2027, nombre = "Feria 2027", inicio = 2027-05-01, fin = 2027-05-10
4. Submit

**Aserciones**:
- Redirige a `/admin/ediciones`
- "Feria 2027" aparece en el listado

---

### CASO-ADMIN-002: Activar edición desactiva la anterior

**Rol**: admin
**Precondición**: 2 ediciones existentes (la activa San Isidro 2026 + Feria 2027 creada en CASO-ADMIN-001).
**Pasos**:
1. Activar "Feria 2027"

**Aserciones**:
- "Feria 2027" muestra badge "activa"
- "San Isidro 2026" deja de tener el badge "activa"

---

### CASO-ADMIN-003: Crear caseta

**Rol**: admin
**Pasos**:
1. Navegar a `/admin/casetas`, "Nueva caseta"
2. Nombre = "Caseta Norte", ubicación = "Recinto Norte"
3. Submit

**Aserciones**:
- "Caseta Norte" en listado de casetas activas

---

### CASO-ADMIN-004: Crear empleado con DNI

**Rol**: admin
**Pasos**:
1. Navegar a `/admin/empleados`, "Nuevo empleado"
2. Nombre = "Juan Pérez", DNI = "12345678Z", tipo = "trabajador", jornal = 70
3. Submit

**Aserciones**:
- "Juan Pérez" en listado
- DNI visible al editarlo

---

### CASO-ADMIN-005: Crear empleado voluntario fuerza jornalDiario null

**Rol**: admin
**Pasos**:
1. Crear empleado con tipo = "voluntario", nombre = "Vol Uno"
2. Intentar fijar jornal = 70€

**Aserciones**:
- O bien el campo de jornal se desactiva al elegir voluntario
- O bien el submit falla validación
- Empleado creado tiene jornal = null

---

### CASO-ADMIN-006: Editar empleado cambia email y DNI

**Rol**: admin
**Precondición**: Empleado existente.
**Pasos**:
1. Abrir empleado, modificar email y DNI
2. Submit

**Aserciones**:
- Cambios persisten tras refresh

---

### CASO-ADMIN-007: Crear usuario con rol gerente

**Rol**: admin
**Pasos**:
1. Navegar a `/admin/usuarios`, "Nuevo usuario"
2. Email = `nuevo@caseta.test`, nombre = "Nuevo Gerente", rol = gerente, password = `test1234!`
3. Submit

**Aserciones**:
- Usuario en listado
- Logout y login con `nuevo@caseta.test` / `test1234!` funciona

---

### CASO-ADMIN-008: Desactivar usuario impide login

**Rol**: admin
**Precondición**: Usuario CASO-ADMIN-007 creado.
**Pasos**:
1. Editar usuario, marcar como inactivo
2. Logout
3. Intentar login con sus credenciales

**Aserciones**:
- Login falla con error de cuenta inactiva o credenciales

---

### CASO-ADMIN-009: Crear proveedor

**Rol**: admin
**Pasos**:
1. Navegar a `/admin/proveedores`, "Nuevo proveedor"
2. Nombre = "Mahou", email = "ventas@mahou.es", teléfono = "915000000"
3. Submit

**Aserciones**:
- Proveedor visible en listado y disponible al crear pedidos

---

### CASO-ADMIN-010: Crear tipo de empleado custom

**Rol**: admin
**Pasos**:
1. Navegar a `/admin/tipos-empleado` (si existe), "Nuevo tipo"
2. Slug = "barra", nombre = "Barra"
3. Submit

**Aserciones**:
- Tipo aparece y es seleccionable al crear empleados

---

### CASO-ADMIN-011: Listado de empleados filtrable

**Rol**: admin
**Precondición**: Varios empleados con tipos distintos.
**Pasos**:
1. Navegar a `/admin/empleados`
2. Filtrar por tipo = "voluntario"

**Aserciones**:
- Solo aparecen empleados con ese tipo

---

### CASO-ADMIN-012: Vista de turnos por empleado (colapsables)

**Rol**: admin
**Precondición**: Empleado con turnos asignados.
**Pasos**:
1. Navegar a `/admin/empleados`, abrir el empleado
2. Expandir sección "Turnos asignados"

**Aserciones**:
- Se listan todos sus turnos agrupados por fecha
