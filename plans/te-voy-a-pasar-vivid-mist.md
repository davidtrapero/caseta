# Plan — Fixes QA empleados / tipos / apuntarse

## Context

Revisión de errores reportados por capturas durante uso real (mayo 2026). Se agrupan por módulo. Todos los problemas detectados están en flujos ya en producción tras los commits recientes "CRUD tipos de empleado" y "edición mejorada de empleados".

---

## Módulo: Empleados

### 1. Bug "Tipo de empleado inválido" al editar voluntario

**Síntoma:** al guardar un empleado seleccionando el chip "Voluntario", aparece el banner rojo *"Tipo de empleado inválido"* bajo los chips. El error sale del `FieldError` asociado a `errors.tipoEmpleadoId`.

**Causa raíz probable** (a confirmar en ejecución):

- La validación Zod [app/src/app/(app)/empleados/schema.ts:38](app/src/app/(app)/empleados/schema.ts#L38) usa `z.string().cuid("Tipo de empleado inválido")`.
- El form envía el `id` correcto del `TipoEmpleado` ([app/src/app/(app)/empleados/_components/empleado-form.tsx:140](app/src/app/(app)/empleados/_components/empleado-form.tsx#L140)).
- En la edición, [app/src/app/(app)/empleados/[id]/page.tsx:35-40](app/src/app/(app)/empleados/[id]/page.tsx#L35-L40) carga `tiposEmpleado` con `where: { OR: [{ activo: true }, { id: empleado.tipoEmpleadoId }] }` — eso garantiza que el tipo actual aparece. Pero si el id del tipo voluntario seed no es CUID (p.ej. fue creado con id estable tipo `"voluntario"` o un UUID), `z.string().cuid()` lo rechaza con el mensaje exacto del bug.
- `TipoEmpleado.id` está declarado como `@default(cuid())` en [app/prisma/schema.prisma:27](app/prisma/schema.prisma#L27), pero registros previos a esa migración o cargados por seed manual pueden no serlo.

**Archivos a tocar:**

- [app/src/app/(app)/empleados/schema.ts:38](app/src/app/(app)/empleados/schema.ts#L38) — relajar validación: cambiar `z.string().cuid("Tipo de empleado inválido")` por `z.string().min(1, "Tipo de empleado inválido")`. La validación real (existencia + activo) ya la hace `validarReglaVoluntario` en [app/src/app/(app)/empleados/actions.ts:36-42](app/src/app/(app)/empleados/actions.ts#L36-L42) con `prisma.tipoEmpleado.findUnique`.

**Verificación:**

- Editar un empleado existente y cambiar tipo a "Voluntario" → debe guardar.
- Crear nuevo empleado tipo "Voluntario" con entidad y sin DNI → debe guardar.
- Probar todos los demás chips (Vigilante/Coordinador/Trabajador/Ayudante) → no regresión.

---

### 2. Alineación de campos en tarjeta de empleado

**Síntoma:** en la tarjeta del listado, los pares `DNI: – Tel: 667... Jornal: VOLUNTARIO` quedan desalineados visualmente — al usar `flex-wrap` los items se separan con `gap-x-4` pero no comparten ancho de columna.

**Archivo a tocar:**

- [app/src/app/(app)/empleados/_components/empleado-card.tsx:75-100](app/src/app/(app)/empleados/_components/empleado-card.tsx#L75-L100) — sustituir `flex flex-wrap gap-x-4 gap-y-1` por un grid responsive con columnas fijas. Propuesta: `grid grid-cols-[auto_auto] sm:grid-cols-[auto_auto_auto_auto] gap-x-5 gap-y-1` y separar etiqueta/valor en dos `<span>` adyacentes para que las etiquetas alineen verticalmente.

**Verificación:**

- Cargar listado de empleados con mezcla de voluntarios (DNI vacío, jornal "Voluntario") y trabajadores (jornal numérico, DNI presente).
- Confirmar visualmente que las columnas DNI/Tel/Email/Jornal alinean.

---

## Módulo: Admin → Tipos de empleado

### 3. Simplificar formulario de creación de tipo

**Decisión del usuario:** mantener el checkbox `Es tipo de voluntario`. Quitar el resto.

**Archivos a tocar:**

- [app/src/app/(app)/admin/tipos-empleado/_components/tipo-empleado-form.tsx](app/src/app/(app)/admin/tipos-empleado/_components/tipo-empleado-form.tsx):
  - **Quitar bloque Hex** ([líneas 158-169](app/src/app/(app)/admin/tipos-empleado/_components/tipo-empleado-form.tsx#L158-L169)): mantener solo el `<input type="color">` ([líneas 149-155](app/src/app/(app)/admin/tipos-empleado/_components/tipo-empleado-form.tsx#L149-L155)) que ya alimenta el state `colorHex`. Añadir un `<input type="hidden" name="colorHex" value={colorHex}>` cerca del color picker para mantener el envío al server. El bloque "Vista previa" ([172-195](app/src/app/(app)/admin/tipos-empleado/_components/tipo-empleado-form.tsx#L172-L195)) sigue funcionando porque depende del state.
  - **Quitar bloque Orden** ([líneas 197-212](app/src/app/(app)/admin/tipos-empleado/_components/tipo-empleado-form.tsx#L197-L212)): mantener solo en modo `editar` (envuelto en `{modo === "editar" && (...)}`). En modo `crear`, no se pregunta — el server calcula `max(orden) + 10` o usa `0` por defecto.
  - **Mantener checkbox "Es tipo de voluntario"** ([214-224](app/src/app/(app)/admin/tipos-empleado/_components/tipo-empleado-form.tsx#L214-L224)) tal cual.
  - **Quitar checkbox "Tipo activo"** en modo `crear` ([226-234](app/src/app/(app)/admin/tipos-empleado/_components/tipo-empleado-form.tsx#L226-L234)): envolver en `{modo === "editar" && (...)}`. En crear, el server fuerza `activo: true`.
  - **Slug**: cambiar el `<Label>` de `"Slug"` a `"Identificador interno"` ([línea 85](app/src/app/(app)/admin/tipos-empleado/_components/tipo-empleado-form.tsx#L85)). Texto descriptivo ([línea 107-110](app/src/app/(app)/admin/tipos-empleado/_components/tipo-empleado-form.tsx#L107-L110)) reescribir a algo tipo *"Texto corto que identifica el tipo en el sistema. Solo letras minúsculas y guiones."*. Mantener `name="slug"` para no romper la action.

**Acción schema/server:**

- [app/src/app/(app)/admin/tipos-empleado/schema.ts](app/src/app/(app)/admin/tipos-empleado/schema.ts):
  - `crearTipoEmpleadoSchema`: `activo` con `.default(true)`, `orden` con `.default(0)` (o calculado en action). Como ahora se omiten en el form de creación, el preprocess `checkbox` recibirá `undefined` y debe resolver a `true` para `activo`. Más limpio: separar schemas (no extender `baseTipoEmpleado` para crear, definir uno propio sin `activo` ni `orden`) y poner los defaults en la action de crear ([app/src/app/(app)/admin/tipos-empleado/actions.ts](app/src/app/(app)/admin/tipos-empleado/actions.ts)).

**Verificación:**

- Crear nuevo tipo desde `/admin/tipos-empleado/nuevo` con formulario reducido.
- Confirmar que queda `activo: true` y aparece en chips de empleados.
- Editar un tipo existente y comprobar que sí aparecen `Orden` y `Activo`.
- Marcar "Es tipo voluntario" al crear → confirmar que aparece como tipo voluntario en `/apuntarse/[token]`.

**Verificación:**

- Crear nuevo tipo desde `/admin/tipos-empleado/nuevo` con formulario reducido.
- Confirmar que el tipo creado queda `activo: true` y aparece en chips de empleados.
- Editar un tipo existente y comprobar que en modo edición sí aparecen `Orden` (si se mantiene allí) y `Activo`.

---

## Módulo: Turnos (raíz del problema de "apuntarse")

### 4. Duplicar turnos sin asignaciones → pierde las vacantes (data ya corrupta)

**Aclaración del usuario:** *"al duplicar se deberían copiar las vacantes vacías si se decide duplicar sin copiar las asignaciones. Ahora si seleccionas sin copiar asignaciones los crea sin vacantes."*

**Estado real del código (verificado en lectura directa):**

- El commit `77c2e4b` ya corrigió esto. La función [validarYCopiarTurnos](app/src/app/(app)/turnos/actions.ts#L782) en [app/src/app/(app)/turnos/actions.ts:814](app/src/app/(app)/turnos/actions.ts#L814) construye el plan con `plazas: t.plazas.filter((p) => p.cantidad > 0)` **siempre**, independientemente del flag `copiarAsignaciones`. Y en [línea 876-883](app/src/app/(app)/turnos/actions.ts#L876-L883) las inserta vía `tx.turnoPlaza.createMany`.
- O sea: hoy mismo, si duplicas un turno que tiene plazas, las plazas se copian. La lógica está bien.

**Hipótesis del bug que ve el usuario:**

Los turnos que está duplicando **ya están sin plazas en origen**. Probablemente son turnos creados por duplicaciones anteriores al commit `77c2e4b`, cuando esa duplicación sí perdía las plazas. La data quedó corrupta entonces; al duplicar uno de esos turnos hoy, `t.plazas` viene vacío de origen y por tanto el destino también queda vacío. No es un bug de la duplicación actual — es deuda de datos.

**Decisión del usuario:** ambas — limpieza puntual + fallback en duplicación.

**4a. Limpieza puntual de datos (acción admin):**

- Crear server action `rellenarPlazasTurnosSinPlazas` en [app/src/app/(app)/turnos/actions.ts](app/src/app/(app)/turnos/actions.ts) que:
  1. `requireRole(["admin"])`.
  2. Busca turnos en la edición activa donde `plazas` está vacío (`plazas: { none: {} }`).
  3. Por cada turno, lee la caseta y usa sus defaults para crear las plazas faltantes. **Decidir cuál es el default**: hoy `Caseta.tipoEmpleadoDefectoId` es un solo tipo. Hace falta un default real "plantilla de plazas por caseta", probablemente con cantidades. Alternativa pragmática: introducir 1 plaza del `tipoEmpleadoDefectoId` con `cantidad = 1` + 1 plaza del primer tipo voluntario activo con `cantidad = 1`. Confirmar con el usuario qué default usar (o pedirlo en el dialog).
  4. Crea las `TurnoPlaza` faltantes en una transacción con `withAuditContext`.
- Botón en `/admin/casetas/[id]` o en `/turnos/semana` para disparar la acción con un `<Dialog>` que muestre cuántos turnos serán afectados antes de ejecutar.

**4b. Fallback en duplicación:**

- Tocar [validarYCopiarTurnos:808-815](app/src/app/(app)/turnos/actions.ts#L808-L815):
  - Si `t.plazas.length === 0`, en lugar de copiar `[]`, leer las plazas de un turno reciente con plazas en la misma caseta o usar la plantilla por defecto de la caseta destino.
  - Como esto requiere lookup adicional, hacerlo antes de construir `plan` (consulta agrupada por caseta para no hacer N+1).
  - Loggear (vía `console.warn` o auditoría) que se aplicó el fallback para visibilidad.

**Verificación:**

- Reproducir: en preprod, crear un turno **sin plazas** manualmente (o identificar uno existente). Duplicarlo con flag desactivado. Confirmar que el duplicado aparece sin vacantes.
- Crear un turno **con plazas** desde cero, duplicarlo con flag desactivado. Confirmar que el duplicado conserva las plazas.
- Si Opción A o B: tras aplicar, repetir flujo y comprobar que los turnos en `/apuntarse/[token]` ya aparecen.

---

## Módulo: Apuntarse (formulario público de voluntarios)

### 5. Añadir filtros por día y caseta en el formulario público

**Archivo a tocar:**

- [app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx](app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx):
  - Añadir dos `<select>` arriba de la sección "Turnos disponibles" (uno con días, otro con casetas, ambos con opción "Todos").
  - Estado cliente con `useState` para los filtros, derivado del array `dias` (props ya tipado como `DiaTurnos[]`).
  - Filtrar `dias` y dentro de cada día filtrar `casetas` antes de renderizar. No tocar backend; el filtrado es solo client-side.
  - UX: si tras filtrar no quedan turnos, mostrar mensaje "No hay turnos para los filtros seleccionados".

**Verificación:**

- Cargar `/apuntarse/[token]` con varios días y casetas → ver todos.
- Filtrar por un día → solo ese día.
- Filtrar por caseta → solo esa caseta dentro de cada día visible.
- Combinación de filtros.

---

## Orden de ejecución sugerido

1. Fix Zod del tipo (Empleados → 1) — desbloquea edición de voluntarios.
2. Alineación tarjeta empleado (Empleados → 2).
3. Simplificación form tipo empleado (Admin → 3).
4. Limpieza/fallback de turnos sin plazas (Turnos → 4) — tras decisión A/B/C.
5. Filtros día/caseta en formulario público (Apuntarse → 5).
