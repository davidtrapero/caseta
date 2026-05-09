# Casos QA — Voluntarios

Cobertura: formulario público con token, validación de solapamientos en solicitudes, aprobación/rechazo desde admin.

---

### CASO-VOL-001: Acceso al formulario público con token válido

**Rol**: público
**Precondición**: Edición activa con `formularioToken` (verificarlo desde admin si fuera necesario; en seed mínimo no está creado — primero generarlo desde `/admin/ediciones` editando la edición activa para activar el formulario).
**Pasos**:
1. Login como admin, navegar a `/admin/ediciones`, abrir edición activa, activar formulario público y copiar el token
2. Logout
3. Navegar a `/apuntarse/<token>`

**Aserciones**:
- Página carga sin requerir login
- Formulario con campos: nombre, DNI, teléfono, fecha del turno, caseta, comentarios
- Heading menciona "Apuntarse" o nombre de la edición

---

### CASO-VOL-002: Token inválido devuelve 404 o página de error

**Rol**: público
**Pasos**:
1. Sin login, navegar a `/apuntarse/token-falso-1234`

**Aserciones**:
- Status 404 o página de error visible (no formulario)

---

### CASO-VOL-003: Enviar solicitud de voluntario crea entrada pendiente

**Rol**: público
**Pasos**:
1. Acceder al formulario público con token válido
2. Rellenar: nombre "Voluntario Uno", DNI "12345678A", teléfono "600111222", caseta = "Caseta Test", fecha = 2026-05-03
3. Submit

**Aserciones**:
- Redirección a `/apuntarse/<token>/gracias`
- En `/admin/solicitudes` (login como admin) aparece la solicitud con estado "pendiente"

---

### CASO-VOL-004: Aprobar solicitud crea empleado y asignación

**Rol**: admin
**Precondición**: Solicitud pendiente de CASO-VOL-003.
**Pasos**:
1. Navegar a `/admin/solicitudes`
2. Abrir solicitud, click "Aprobar"
3. Confirmar

**Aserciones**:
- Estado cambia a "aprobada"
- En `/admin/empleados` existe "Voluntario Uno" con tipo "voluntario" y `jornalDiario = null`
- En `/turnos` la fecha 2026-05-03 hay turno con el voluntario asignado (o turno creado si no existía)

---

### CASO-VOL-005: Rechazar solicitud no crea empleado

**Rol**: admin
**Precondición**: Solicitud pendiente.
**Pasos**:
1. Abrir solicitud, click "Rechazar"
2. Confirmar (opcional: añadir motivo)

**Aserciones**:
- Estado = "rechazada"
- NO se crea empleado correspondiente

---

### CASO-VOL-007: Formulario público muestra filtros de Día y Caseta

**Rol**: público
**Precondición**: Edición activa con formulario público activado y al menos un turno con plazas disponibles para voluntarios.
**Pasos**:
1. Navegar a `/apuntarse/<token>`
2. Localizar la sección "Turnos disponibles"

**Aserciones**:
- Encima de la lista de turnos aparecen dos selectores: "Día" y "Caseta"
- "Día" tiene primera opción "Todos los días" y luego un option por cada día con turnos
- "Caseta" tiene primera opción "Todas las casetas" y luego un option por cada caseta única con turnos

---

### CASO-VOL-008: Filtrar por día muestra solo turnos de ese día

**Rol**: público
**Precondición**: Al menos dos días distintos con turnos disponibles.
**Pasos**:
1. Navegar a `/apuntarse/<token>`
2. Seleccionar un día concreto en el filtro "Día"

**Aserciones**:
- Solo aparecen los grupos (`<h3>` con el título del día) correspondientes al día seleccionado
- Los turnos de los demás días no se renderizan

---

### CASO-VOL-009: Filtrar por caseta muestra solo turnos de esa caseta

**Rol**: público
**Precondición**: Al menos dos casetas con turnos disponibles.
**Pasos**:
1. Navegar a `/apuntarse/<token>`
2. Seleccionar una caseta concreta en el filtro "Caseta"

**Aserciones**:
- En cada día visible solo aparece el `<fieldset>` de la caseta seleccionada
- Días que no tienen turnos para esa caseta dejan de mostrarse

---

### CASO-VOL-010: Filtros combinados día + caseta

**Rol**: público
**Precondición**: Existe combinación día/caseta con al menos un turno y otra combinación distinta con otros turnos.
**Pasos**:
1. Navegar a `/apuntarse/<token>`
2. Seleccionar un día concreto y una caseta concreta

**Aserciones**:
- Solo se muestran los turnos que coinciden simultáneamente con día y caseta seleccionados

---

### CASO-VOL-011: Filtros sin resultados muestran mensaje específico

**Rol**: público
**Pasos**:
1. Navegar a `/apuntarse/<token>`
2. Seleccionar combinación día + caseta para la que no haya turnos disponibles

**Aserciones**:
- En lugar de la lista de fieldsets aparece el texto: "No hay turnos para los filtros seleccionados."
- No se renderiza ningún `<fieldset>` de turnos

---

### CASO-VOL-006: Solicitud con solapamiento se marca o bloquea al aprobar

**Rol**: admin
**Precondición**: Empleado existente con turno [10:00, 14:00] el 2026-05-03; solicitud pendiente que pediría asignar al mismo empleado en horario solapado.
**Pasos**:
1. Intentar aprobar la solicitud

**Aserciones**:
- O bien el sistema bloquea la aprobación con mensaje de conflicto
- O bien la aprueba pero marca warning visible
- Verificar comportamiento esperado en [src/lib/turnos-solape.ts](../../app/src/lib/turnos-solape.ts)
