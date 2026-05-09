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

### CASO-VOL-006: Solicitud con solapamiento se marca o bloquea al aprobar

**Rol**: admin
**Precondición**: Empleado existente con turno [10:00, 14:00] el 2026-05-03; solicitud pendiente que pediría asignar al mismo empleado en horario solapado.
**Pasos**:
1. Intentar aprobar la solicitud

**Aserciones**:
- O bien el sistema bloquea la aprobación con mensaje de conflicto
- O bien la aprueba pero marca warning visible
- Verificar comportamiento esperado en [src/lib/turnos-solape.ts](../../app/src/lib/turnos-solape.ts)
