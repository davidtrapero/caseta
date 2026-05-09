# Casos QA — Turnos

Cobertura: CRUD de turnos, asignación de empleados, detección de solapamientos, duplicación de día/semana, asistencias.

Lógica de solape clave: [src/lib/turnos-solape.ts](../../app/src/lib/turnos-solape.ts) — intervalo `[a,b) ∩ [c,d) ≠ ∅`.

---

### CASO-TURNOS-001: Crear turno sin solapamiento

**Rol**: gerente
**Precondición**: Seed mínimo + 1 empleado creado (crearlo en `/admin/empleados` como parte del caso).
**Pasos**:
1. Login como admin (para crear el empleado primero)
2. Navegar a `/admin/empleados`, click "Nuevo empleado", rellenar nombre "Test Worker", tipo "trabajador", jornal 70€, submit
3. Logout y login como gerente
4. Navegar a `/turnos`
5. Click "Nuevo turno"
6. Caseta = "Caseta Test", fecha = `2026-05-02`, inicio = 10:00, fin = 14:00
7. Asignar empleado "Test Worker"
8. Submit

**Aserciones**:
- El turno aparece en el calendario semanal en la celda 2026-05-02 @ 10:00-14:00
- El empleado "Test Worker" aparece dentro de la tarjeta del turno

---

### CASO-TURNOS-002: Detección de solapamiento al asignar empleado

**Rol**: gerente
**Precondición**: 1 empleado con un turno [10:00, 14:00] el 2026-05-02 en Caseta Test (crear vía UI como en CASO-TURNOS-001).
**Pasos**:
1. Crear un segundo turno el 2026-05-02 [13:00, 17:00] en una segunda caseta (crear caseta también)
2. Intentar asignar al mismo empleado al segundo turno

**Aserciones**:
- El sistema impide la asignación o muestra warning de conflicto
- El empleado **no** queda asignado al segundo turno (verificar abriendo el segundo turno)

---

### CASO-TURNOS-003: Editar turno cambia hora fin correctamente

**Rol**: gerente
**Pasos**:
1. Crear turno 2026-05-02 [10:00, 14:00]
2. Abrir el turno, cambiar fin a 16:00
3. Submit

**Aserciones**:
- Calendario refleja el turno extendido hasta 16:00
- No hay error en consola de navegador (`browser_console_messages`)

---

### CASO-TURNOS-004: Eliminar turno

**Rol**: gerente
**Pasos**:
1. Crear turno
2. Abrir turno, click eliminar, confirmar

**Aserciones**:
- Turno desaparece del calendario
- Refresh de página confirma la eliminación

---

### CASO-TURNOS-005: Duplicar día completo

**Rol**: gerente
**Precondición**: Día 2026-05-02 con 2 turnos creados.
**Pasos**:
1. En calendario semanal, usar acción "Duplicar día" desde 2026-05-02 hacia 2026-05-03

**Aserciones**:
- 2026-05-03 contiene los mismos 2 turnos (mismo horario, mismas casetas)
- Empleados asignados se duplican o se dejan vacíos (verificar comportamiento esperado en UI)

---

### CASO-TURNOS-006: Duplicar semana completa

**Rol**: gerente
**Pasos**:
1. Semana con varios turnos creados
2. Duplicar semana hacia la siguiente

**Aserciones**:
- Todos los turnos aparecen replicados con offset de 7 días

---

### CASO-TURNOS-007: Marcar asistencia

**Rol**: gerente
**Precondición**: Turno con empleado asignado en fecha pasada o presente.
**Pasos**:
1. Navegar a `/turnos/asistencias`
2. Marcar empleado como "presente" / "ausente"

**Aserciones**:
- El estado persiste tras refresh
- Recuento de asistencias agregado refleja el cambio

---

### CASO-TURNOS-008: Imprimir vista semanal

**Rol**: gerente
**Pasos**:
1. Navegar a `/turnos/imprimir`

**Aserciones**:
- Página renderiza sin errores
- Layout es printable (sin sidebar, sin botones de acción)
