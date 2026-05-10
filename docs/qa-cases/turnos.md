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

---

### CASO-TURNOS-009: Combo "+ empleado" se solapa por encima de turnos siguientes

**Rol**: gerente
**Precondición**: Día con al menos 3 turnos verticales en la misma caseta.
**Pasos**:
1. Navegar a `/turnos?fecha=<YYYY-MM-DD>&casetaId=<id>`
2. Pulsar "+ empleado" en el primer turno (el de arriba)
3. Verificar que el dropdown se renderiza por delante visualmente
4. Pulsar `Escape`
5. Volver a abrir y hacer click fuera

**Aserciones**:
- El dropdown abierto se solapa por encima de los turnos siguientes (no queda atrapado por overflow del layout). El popover usa `role="dialog"` (Radix Popover), por lo que `expect(page.getByRole("dialog")).toBeVisible()` es selector estable
- Tecla `Escape` cierra el popover
- Click-outside cierra el popover
- Tras seleccionar un empleado, el popover se cierra solo y el chip aparece en el turno

---

### CASO-TURNOS-010: Vistas exportables muestran color por tipo de empleado

**Rol**: gerente
**Precondición**: Edición activa con turnos en una fecha y empleados de al menos 2 tipos distintos asignados.
**Pasos**:
1. Navegar a `/turnos/exportar/dia?fecha=<YYYY-MM-DD>&casetaId=<id>`
2. Inspeccionar los chips de empleado de la columna "Empleados"
3. Repetir en `/turnos/exportar/semana?...`, `/turnos/exportar/empleado?empleadoId=<id>` e `/turnos/imprimir?...`

**Aserciones**:
- Cada empleado renderizado lleva atributo `data-tipo-slug` con el slug del tipo (`vigilante`, `coordinador`, `trabajador`, `voluntario`, `ayudante`)
- El estilo inline aplica colores derivados de `TipoEmpleado.colorHex` (background tinte, border lateral del color base)
- En `/turnos/imprimir` cada `.emp-line` lleva `border-left` con el `colorHex` del tipo y se mantiene el checkbox de asistencia
- El CSS de `imprimir/page.tsx` incluye `print-color-adjust: exact`

---

### CASO-TURNOS-011: Duplicar día desde otra caseta

**Rol**: gerente
**Precondición**: Caseta A con 2 turnos planificados el `2026-05-02`. Caseta B existe pero sin turnos ese día.
**Pasos**:
1. Navegar a `/turnos?fecha=2026-05-02&casetaId=<id-caseta-B>`
2. Pulsar "Duplicar día"
3. En el selector "Copiar desde la caseta…" elegir Caseta A
4. Día origen: `2026-05-02`. Día destino: `2026-05-02` (misma fecha pero distinta caseta)
5. Marcar "Copiar también asignaciones"
6. Submit

**Aserciones**:
- Aparece warning sobre revisar dadas de alta cuando origen ≠ destino y `copiarAsignaciones` está marcado
- Tras submit, Caseta B muestra los 2 turnos del día con sus plazas y asignaciones
- Caseta A sigue intacta con sus 2 turnos originales

---

### CASO-TURNOS-012: Duplicar semana desde otra caseta

**Rol**: gerente
**Precondición**: Caseta A con 5 turnos repartidos en una semana. Caseta B sin turnos esa semana.
**Pasos**:
1. Desde `/turnos/semana?casetaId=<id-caseta-B>&semana=<YYYY-Www>`
2. Pulsar "Duplicar semana"
3. Seleccionar Caseta A como origen
4. Lunes destino: el mismo lunes de la semana actual
5. Submit

**Aserciones**:
- Toast informa "5 turnos copiados"
- Caseta B contiene los mismos 5 turnos en los mismos días/horarios
- Si hay solape con turnos pre-existentes en Caseta B, la operación se aborta con error

---

### CASO-TURNOS-013: Regresión — duplicar día dentro de la misma caseta sigue funcionando

**Rol**: gerente
**Precondición**: Caseta con turnos el 2026-05-02.
**Pasos**:
1. En `/turnos?fecha=2026-05-02&casetaId=<id>` pulsar "Duplicar día anterior" o "Duplicar día"
2. Sin tocar el selector de caseta (queda en "(esta caseta)" por defecto)
3. Día destino: `2026-05-03`
4. Submit

**Aserciones**:
- Comportamiento idéntico al previo a feature de cross-caseta
- Los 2 turnos aparecen replicados el 2026-05-03 en la misma caseta
- No aparece warning sobre dadas de alta (origen == destino)

---

<!-- TODO qa-catalog-sync (working-tree): revisar y aprobar -->
<!--
### CASO-TURNOS-PROPUESTO-009: Exportar semana de una caseta (PDF/imagen)

**Origen**: feature working tree — añadió `app/src/app/(app)/turnos/exportar/semana/page.tsx`
**Rol**: gerente o cajero
**Precondición**: Edición activa con al menos una caseta y turnos asignados en la semana.
**Pasos**:
1. Navegar a `/turnos/semana?casetaId=<id>&semana=<YYYY-Www>`
2. Pulsar el botón "Exportar semana" (abre `/turnos/exportar/semana?...` en nueva pestaña)
3. Pulsar "Imprimir / PDF" → diálogo de impresión del navegador
4. Volver a la pestaña, pulsar "Descargar imagen" → PNG en disco

**Aserciones**:
- La vista exportable muestra una tabla agrupada por día con columnas Día, Horario, Plazas, Asignados
- Cada turno con plazas no cubiertas emite filas adicionales con texto "VACANTE — <tipo>" en granate
- El pie muestra resumen: número total de plazas sin cubrir desglosado por tipo de empleado
- El PNG descargado tiene el fondo beige (#ebe3d3) y la tabla legible

**Notas**:
- Cambio detectado automáticamente. Verificar manualmente que el caso es ejecutable y completo.
-->

<!-- TODO qa-catalog-sync (working-tree): revisar y aprobar -->
<!--
### CASO-TURNOS-PROPUESTO-010: Exportar día de una caseta (consulta sin checkboxes)

**Origen**: feature working tree — añadió `app/src/app/(app)/turnos/exportar/dia/page.tsx`
**Rol**: gerente o cajero
**Precondición**: Edición activa con turnos en una fecha concreta.
**Pasos**:
1. Navegar a `/turnos/imprimir?fecha=<YYYY-MM-DD>&casetaId=<id>`
2. Pulsar "Vista exportable (sin checkboxes)" → abre `/turnos/exportar/dia?...`
3. Verificar tabla y resumen de huecos

**Aserciones**:
- La vista de export NO tiene checkboxes de asistencia (a diferencia de `/turnos/imprimir`)
- Filas VACANTE aparecen en granate cuando hay plazas sin cubrir
- El resumen al pie agrupa los huecos por tipo de empleado
- Botones "Imprimir / PDF" y "Descargar imagen" son funcionales

**Notas**:
- Coexiste con `/turnos/imprimir` (vista con checkboxes para fichaje en papel) — son casos de uso distintos.
-->

<!-- TODO qa-catalog-sync (working-tree): revisar y aprobar -->
<!--
### CASO-TURNOS-PROPUESTO-011: Exportar vista global semanal (todas las casetas)

**Origen**: feature working tree — añadió `app/src/app/(app)/turnos/exportar/semana-global/page.tsx`
**Rol**: gerente o admin
**Precondición**: Edición activa con varias casetas y turnos repartidos.
**Pasos**:
1. Navegar a `/turnos/semana`
2. Pulsar "Vista global"
3. Comprobar matriz casetas × días

**Aserciones**:
- Tabla con una fila por caseta y 7 columnas (días)
- Cada celda muestra "N turnos / M pers." y, si hay vacantes, badge "X vacante(s)" en granate
- Celdas con vacantes destacan con fondo `--destructive` (clase `export-vacante`)
- Resumen al pie con el total de plazas sin cubrir de toda la semana
- En `@page` el formato es A4 horizontal (landscape)

**Notas**:
- Vista cross-caseta — confirma que `loadSemanaGlobal` no filtra por casetaId.
-->

<!-- TODO qa-catalog-sync (working-tree): revisar y aprobar -->
<!--
### CASO-TURNOS-PROPUESTO-012: Exportar turnos de un empleado en un rango

**Origen**: feature working tree — añadió `app/src/app/(app)/turnos/exportar/empleado/page.tsx`; integración en `empleados/[id]/_components/TurnosAsignadosEmpleado.tsx`
**Rol**: admin o gerente
**Precondición**: Empleado con al menos un turno asignado en la edición activa.
**Pasos**:
1. Navegar a `/empleados/<id>`
2. Pulsar "Exportar turnos" en la sección "Turnos asignados"
3. Verificar tabla y totales

**Aserciones**:
- Tabla con columnas Fecha, Caseta, Horario, Duración, Asistencia
- Cada fila representa un turno asignado al empleado en el rango (por defecto = edición completa)
- Símbolo `■` verde si asistió, `□` si no
- Pie muestra totales: número de turnos, horas totales, asistencias / total
- Si se pasan `desde`/`hasta` por query string, el rango se respeta

**Notas**:
- Útil para entregar el cuadrante individual a cada voluntario o empleado.
-->
