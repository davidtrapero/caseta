# Casos QA — Caja

Cobertura: cierres diarios (creación, edición, bloqueo), gastos, nóminas, balance de edición.

---

### CASO-CAJA-001: Crear cierre diario aparece en balance

**Rol**: admin
**Pasos**:
1. Login como admin
2. Navegar a `/caja/cierres/nuevo`
3. Caseta = "Caseta Test", fecha = `2026-05-02`, ingresos = 500
4. Submit

**Aserciones**:
- Redirige a `/caja/cierres` y muestra el cierre creado
- Navegar a `/caja/balance`: la fila contiene "500" y "Caseta Test"

---

### CASO-CAJA-002: Bloquear cierre como admin

**Rol**: admin
**Precondición**: 1 cierre creado.
**Pasos**:
1. Abrir el cierre desde `/caja/cierres`
2. Click "Bloquear"
3. Confirmar

**Aserciones**:
- Estado del cierre cambia a "bloqueado" (badge / icono visible)
- Botones de edición desaparecen para usuarios no admin

---

### CASO-CAJA-003: Cajero NO puede bloquear cierre

Ver [CASO-AUTHZ-007](authz.md#caso-authz-007-cajero-no-puede-bloquear-un-cierre).

---

### CASO-CAJA-004: Editar cierre bloqueado falla

**Rol**: admin
**Precondición**: Cierre bloqueado de CASO-CAJA-002.
**Pasos**:
1. Intentar editar el cierre bloqueado

**Aserciones**:
- O bien el formulario es read-only, o el submit falla con mensaje claro
- AuditLog **no** registra modificación (verificable solo si la UI lo expone)

---

### CASO-CAJA-005: Crear gasto

**Rol**: cajero
**Pasos**:
1. Login como cajero
2. Navegar a `/caja/gastos`, click "Nuevo gasto"
3. Concepto = "Hielo", importe = 50€, proveedor = "Proveedor Test", fecha = hoy
4. Submit

**Aserciones**:
- Gasto aparece en el listado
- En `/caja/balance`, el total de gastos refleja los 50€

---

### CASO-CAJA-006: Eliminar gasto

**Rol**: gerente
**Precondición**: 1 gasto creado.
**Pasos**:
1. Abrir gasto, click eliminar, confirmar

**Aserciones**:
- Gasto desaparece
- Balance se actualiza

---

### CASO-CAJA-007: Cálculo de nóminas

**Rol**: admin
**Precondición**: Empleado con jornal 70€ y 2 turnos en distintos días con asistencia confirmada.
**Pasos**:
1. Navegar a `/caja/nominas`
2. Seleccionar la edición activa
3. Click "Calcular nóminas"

**Aserciones**:
- Aparece fila para el empleado con total = 140€ (70€ × 2 días)
- Voluntarios (jornal null) NO aparecen en el cálculo

---

### CASO-CAJA-008: Balance de edición incluye cierres − gastos − nóminas

**Rol**: admin
**Precondición**: 1 cierre 500€, 1 gasto 50€, nóminas 140€.
**Pasos**:
1. Navegar a `/caja/balance`

**Aserciones**:
- Total ingresos = 500
- Total gastos = 50
- Total nóminas = 140
- Balance neto = 500 − 50 − 140 = 310

---

### CASO-CAJA-009: No se pueden duplicar cierres por (caseta, fecha)

**Rol**: admin
**Pasos**:
1. Crear cierre Caseta Test / 2026-05-02 / 500€ → OK
2. Intentar crear segundo cierre con misma caseta y fecha

**Aserciones**:
- El sistema rechaza con error claro (constraint UNIQUE en BD esperado)
