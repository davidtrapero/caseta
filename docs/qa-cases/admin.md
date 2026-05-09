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
**Precondición**: Existe al menos una entidad activa (crear desde `/admin/entidades` si no la hay).
**Pasos**:
1. Crear empleado con tipo = "voluntario", nombre = "Vol Uno", entidad = la creada
2. Dejar DNI vacío y jornal vacío
3. Submit

**Aserciones**:
- O bien el campo de jornal se desactiva al elegir voluntario
- O bien el submit falla validación
- Empleado creado tiene jornal = null
- DNI no es obligatorio para voluntarios (submit OK con DNI vacío)
- Empleado queda asociado a la entidad seleccionada

---

### CASO-ADMIN-005b: Editar empleado y cambiar tipo a Voluntario guarda sin error

**Rol**: admin
**Precondición**: Empleado "Juan Pérez" creado en CASO-ADMIN-004 (tipo "trabajador", con DNI y jornal).
**Pasos**:
1. Navegar a `/empleados`, abrir Juan Pérez
2. Cambiar tipo a "voluntario"
3. Asignar una entidad activa
4. Submit

**Aserciones**:
- Submit no muestra error de validación de `tipoEmpleadoId` (regresión: la validación Zod ya no exige formato `cuid`, es `min(1)`; existencia/activo se valida en la action)
- Cambios persisten tras refresh
- Empleado pasa a tener `jornalDiario = null`

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

### CASO-ADMIN-010: Crear tipo de empleado custom (formulario simplificado)

**Rol**: admin
**Pasos**:
1. Navegar a `/admin/tipos-empleado`, "Nuevo tipo"
2. Identificador interno = "barra", Etiqueta = "Barra", Etiqueta corta = "Barra"
3. Elegir un color en el picker
4. Dejar "Es tipo de voluntario" sin marcar
5. Submit

**Aserciones**:
- En modo crear NO aparecen los campos: Hex en texto, Orden, ni el checkbox "Tipo activo"
- Sí aparecen: Identificador interno, Etiqueta, Etiqueta corta, Color (picker), Vista previa, "Es tipo de voluntario"
- Tras submit, el tipo creado queda con `activo = true` y `orden = max(orden) + 10` automáticamente
- Tipo aparece y es seleccionable al crear empleados

---

### CASO-ADMIN-010b: Editar tipo de empleado expone Orden y Tipo activo

**Rol**: admin
**Precondición**: Tipo "barra" creado en CASO-ADMIN-010.
**Pasos**:
1. Abrir tipo "barra" en `/admin/tipos-empleado`
2. Verificar que aparecen los campos Orden y "Tipo activo"
3. Cambiar orden a 5, desmarcar "Tipo activo"
4. Submit

**Aserciones**:
- Cambios persisten tras refresh
- El tipo desactivado deja de aparecer como opción al crear empleados (o aparece marcado como inactivo)
- El identificador interno (slug) sigue siendo de solo lectura

---

### CASO-ADMIN-010c: Crear tipo voluntario y aparece como opción en /apuntarse

**Rol**: admin
**Precondición**: Edición activa con formulario público activado y token copiado.
**Pasos**:
1. En `/admin/tipos-empleado`, crear tipo: identificador "hermandad-rocio", etiqueta "Hermandad del Rocío", etiqueta corta "Rocío", marcar "Es tipo de voluntario"
2. Submit
3. Logout y navegar a `/apuntarse/<token>`

**Aserciones**:
- El tipo se crea con `activo = true` y `esVoluntario = true`
- El nuevo tipo no aparece como entidad/opción de tipo en el formulario público (los voluntarios eligen entidad, no tipo), pero sí queda disponible como tipo asignable al aprobar la solicitud desde `/admin/solicitudes`

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

---

### CASO-ADMIN-013: Tarjeta de empleado en listado muestra DNI/Tel/Email/Jornal alineados

**Rol**: admin (verificación manual / regresión visual)
**Precondición**: Empleado con DNI, teléfono, email y jornal cumplimentados.
**Pasos**:
1. Navegar a `/empleados`
2. Localizar la tarjeta del empleado

**Aserciones**:
- Las etiquetas "DNI:", "Tel:", "Email:", "Jornal:" están presentes en ese orden
- Los pares etiqueta/valor se alinean en grid (`[auto_1fr]` en mobile, `[auto_1fr_auto_1fr]` ≥sm) — etiquetas a la izquierda, valores alineados verticalmente
- Para empleado voluntario, "Jornal:" muestra badge "Voluntario" en lugar de importe
