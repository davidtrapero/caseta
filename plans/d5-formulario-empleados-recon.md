# Recon: D5.1–D5.11 — Formulario público empleados (análogo a voluntarios)

> **Brief de contexto para `superpowers:writing-plans`.** Este documento NO es el plan final; es el material que `writing-plans` usará para redactarlo.

## Spec original

Tareas D5.1–D5.11: Implementar formulario público para empleados contratados (análogo al de voluntarios en `/apuntarse/[token]`).

Diferencias clave:
- DNI obligatorio + autocompletado (búsqueda en `Empleado` con rate-limit 20/min/IP)
- `esVoluntario=false` (empleado contratado, no voluntario)
- Crear model `SolicitudEmpleado` + `SolicitudEmpleadoTurno` en schema
- Ruta: `/apuntarse-empleado/[token]`
- Actions: `buscarEmpleadoPorDniAction` (lookup + rate-limit), `crearSolicitudEmpleadoAction` (10/min/IP), `aprobarSolicitudEmpleadoAction`
- Integrar en `/admin/solicitudes` (tab empleados)

## Hallazgos del Explorador

### Archivos clave del patrón voluntarios

1. **Schema Prisma** (`app/prisma/schema.prisma` líneas 434–487)
   - `SolicitudVoluntario` + `SolicitudVoluntarioTurno` — modelo base a replicar
   - Enum `EstadoSolicitud`: pendiente, aprobada, rechazada, parcial, cancelada
   - Enum `EstadoSolicitudTurno`: pendiente, aprobado, rechazado
   - Relaciones: Edicion → SolicitudVoluntario ↔ SolicitudVoluntarioTurno ← Turno, EntidadVoluntario

2. **RSC página** (`app/src/app/apuntarse/[token]/page.tsx`)
   - Carga edición por `formularioToken`
   - Calcula huecos usando `calcularHuecosVoluntario`
   - Agrupa turnos por día/caseta
   - Renderiza componente client `<FormularioVoluntario>`

3. **Schema Zod** (`app/src/app/apuntarse/[token]/schema.ts`)
   - `crearSolicitudSchema`: nombre, telefono?, email?, entidadId, observaciones?, turnoIds[]
   - Validaciones: email ∨ telefono (refine), sin solapamientos internos
   - Exporta `CrearSolicitudInput`

4. **Server actions** (`app/src/app/apuntarse/[token]/actions.ts`)
   - `crearSolicitudAction`: parseForm → rate-limit (bucket "apuntarse", 10/min) → validaciones Zod → transaction
   - En transaction: verifica edición + entidad + turnos + solapamientos + huecos
   - Detecta solape: `detectarSolape` de `turnos-solape.ts` (usando síntesis `tel:...` como empleadoId temporal)
   - Crea `SolicitudVoluntario` + `SolicitudVoluntarioTurno[]` atómicamente
   - Retorna `{ ok, data: {id}, fieldErrors?, values }` (conserva valores en error)
   - Captura valores con `formDataToObject(formData)` antes de validar

5. **Componente client** (`app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx`)
   - `useActionState` + router para flujo completo
   - Secc. datos: nombre, telefono?, email?, entidad, observaciones?
   - Secc. turnos: filtros día/caseta, checkboxes con huecos
   - Badges huecos: rojo si ≤2, gris si ≥3
   - Preserva `state?.values` en inputs `defaultValue`
   - `FormError` global + `FieldError` por campo

### Utilidades reutilizables

1. **Rate-limit** (`app/src/lib/rate-limit.ts`)
   - `checkRateLimit(ip, bucket, limit, windowMs): { allowed, remaining }`
   - In-memory store por serverless instance (aceptable para volumen feria)
   - Buckets actuales: "apuntarse" (10/min)
   - Necesarios nuevos: "apuntarse-empleado-lookup" (20/min), "apuntarse-empleado-crear" (10/min)

2. **Cálculo de huecos** (`app/src/app/(app)/turnos/_lib/huecos.ts`)
   - `calcularHuecosVoluntario(tx, edicionId, opts?)`
   - Cuenta: plazas voluntario - asignados voluntario - solicitudes voluntarias pendientes
   - Soporta filtro `turnoIds?` y exclusión `excluirSolicitudId?` (para aprobaciones)
   - **Necesario análogo** `calcularHuecosEmpleado` pero filtrando `esVoluntario=false`

3. **Detección de solapamientos** (`app/src/lib/turnos-solape.ts`)
   - `detectarSolape(otros, candidato): { solapa, detalles }`
   - Usable directamente; no depende de voluntarios

4. **Action helpers** (`app/src/lib/action-result.ts`)
   - `parseForm(schema, formData): parsedData | throw`
   - `formDataToObject(formData): { [key]: any }`
   - `toActionError(err)`: convierte excepciones no capturadas
   - `type ActionResult<T> = { ok: true, data: T } | { ok: false, error, fieldErrors?, values }`

5. **Audit** (`app/src/lib/audit.ts`)
   - `withAuditContext(userId, fn)`: crea entrada AuditLog automáticamente
   - Usar userId "public:apuntarse-empleado" (análogo a "public:apuntarse")

6. **Empleado lookup** (`app/prisma/schema.prisma` líneas 163–180)
   - `Empleado.dni` es UNIQUE
   - Campo `esVoluntario: Boolean` diferencia voluntarios de contratados
   - Búsqueda: `Empleado.findUnique({ where: { dni }, select: {...} })`
   - Filtro en query: `activo=true AND esVoluntario=false`

### Convenciones del proyecto

- **Idioma**: UI en español, identificadores en inglés (excepto términos dominio: caseta, turno, jornalDiario)
- **Server Actions**: patrón obligatorio `"use server"` → Zod → Prisma → `revalidatePath()` → `ActionResult`
- **Componentes client**: `useActionState` + `useRouter` para flujos completos
- **Form state**: preserve values en error vía `state?.values`
- **Validaciones**: Zod en schema, bordes del sistema (input usuario, APIs externas)
- **Tests**: integration + E2E (Playwright)
- **Rate-limit**: IP-based, buckets semánticos, respuesta uniforme (no revela si rate-limitado vs error real)

### Stack detectado

- **Next.js 16** (App Router), React 19, Tailwind 4, TypeScript 5 strict
- **Prisma 7** con adapter pg (driver JS)
- **Zod 4** para validación
- **shadcn/ui** componentes
- **Playwright** para E2E

## Análisis del Analista

### Tareas atomizadas

| ID | Tarea | Archivos afectados | Dependencias | Tipo | Criterio de cumplimiento |
|---|---|---|---|---|---|
| D5.1 | Migración Prisma: modelos `SolicitudEmpleado` + `SolicitudEmpleadoTurno` | `app/prisma/schema.prisma`, `.prisma/generated/*` | – | DB | Schema válido, migraciones aplicadas, cliente regenerado |
| D5.2 | RSC `/apuntarse-empleado/[token]/page.tsx` carga edición + turnos | `app/src/app/apuntarse-empleado/[token]/page.tsx` (nuevo) | D5.1, D5.3 | RSC | Renderiza `<FormularioEmpleado>`, maneja token inválido |
| D5.3 | Función `calcularHuecosEmpleado` — análogo a voluntarios | `app/src/app/(app)/turnos/_lib/huecos-empleado.ts` (nuevo) | – | Lib | Cuenta huecos filtrando `esVoluntario=false` y solicitudes empleado, test unitario |
| D5.4 | Schema Zod para formulario empleado | `app/src/app/apuntarse-empleado/[token]/schema.ts` (nuevo) | – | Schema | Valida dni (obligatorio), nombre, apellidos, turnos[], refines sin solapamientos |
| D5.5 | `buscarEmpleadoPorDniAction`: lookup + rate-limit 20/min | `app/src/app/apuntarse-empleado/[token]/actions.ts` (nuevo) | Rate-limit | Action | Retorna `{ encontrado: bool, datos?: {...} }`, rate-limit enforzado, respuesta uniforme |
| D5.6 | `crearSolicitudEmpleadoAction`: crear solicitud + rate-limit 10/min | `app/src/app/apuntarse-empleado/[token]/actions.ts` | Rate-limit, D5.1, D5.3 | Action | Crea `SolicitudEmpleado` + `SolicitudEmpleadoTurno[]` atómicamente, valida turnos empleados |
| D5.7 | Componente `<FormularioEmpleado>` client: onBlur DNI → autocompletado | `app/src/app/apuntarse-empleado/[token]/_components/formulario-empleado.tsx` (nuevo) | D5.5 | Component | Busca DNI onBlur, rellena nombre/apellidos/email, preserva valores en error |
| D5.8 | Integrar tab/sección "Empleados" en `/admin/solicitudes` | `app/src/app/(app)/admin/solicitudes/page.tsx` (modif) | D5.1 | Page | Muestra `SolicitudEmpleado[]` con estado, acciones par/rech |
| D5.9 | `aprobarSolicitudEmpleadoAction`: crear/actualizar empleado + asignaciones | `app/src/app/(app)/admin/solicitudes/actions.ts` (nueva) | D5.1 | Action | Si DNI existe: actualiza datos; si no: crea Empleado nuevo (esVoluntario=false) + asignaciones |
| D5.10 | Tests: integración (DNI nuevo, existente, solape, rate-limit, turno rechazado) | `app/src/app/apuntarse-empleado/[token]/__tests__/` (nuevo) | D5.1–D5.9 | Test | 5+ casos, >95% coverage en paths críticos |
| D5.11 | Test E2E: flujo completo público | `e2e/apuntarse-empleado.spec.ts` (nuevo) | D5.1–D5.10 | E2E | Llena formulario, busca DNI, crea solicitud, verifica admin |

### Plan de tests

| Tipo | Archivo | Casos |
|---|---|---|
| Unit | `huecos-empleado.spec.ts` | Cálculo huecos (sin solicitudes, con solicitudes, filtro turnoIds) |
| Integration | `buscar-empleado-action.spec.ts` | DNI válido, DNI no existe, rate-limit, entrada malformada |
| Integration | `crear-solicitud-action.spec.ts` | Transacción exitosa, edición inactiva, turno sin huecos, solapamientos, rate-limit |
| Integration | `aprobar-solicitud-action.spec.ts` | DNI existe (actualiza), DNI no existe (crea), crea asignaciones sin solapamiento |
| E2E | `apuntarse-empleado.spec.ts` | Flujo completo: carga form, busca DNI, rellena datos, selecciona turnos, envía, verificar admin |

### Riesgos y mitigaciones

| Riesgo | Severidad | Mitigation |
|---|---|---|
| DNI duplicado en edición (UNIQUE per edición, no global) | Media | Asegura `SolicitudEmpleado.dni` es UNIQUE per `(edicionId, dni)`, no solo `dni` |
| Rate-limit bypass por cambio de IP | Baja | In-memory store es OK para volumen feria; si escala, revisar Redis |
| Solape entre voluntario + empleado en turno same | Media | `calcularHuecosEmpleado` debe sumar pendientes de voluntarios + empleados; función única |
| Autocompletado expone DNI de empleados activos | Media | Retorna solo si `activo=true AND esVoluntario=false`; respuesta uniforme (no diferencia "no existe" de rate-limitado) |
| Transacción no es atómica si falla a medio crear asignaciones | Baja | Usar `$transaction` con rollback automático; tests verifican atomicidad |

## Decisiones arquitectónicas

### DNI: UNIQUE per (edicionId, dni), no global

Razón: un empleado puede solicitar apuntarse en múltiples ediciones (años distintos). Cada edición tiene su propio ciclo de solicitudes.

**Decisión**: Composite unique en Prisma: `@@unique([edicionId, dni])` en `SolicitudEmpleado`.

---

### Rate-limit: buckets separados para lookup y crear

Razón: prevenir ataque de búsqueda exhaustiva DNI (20/min) vs. creación real (10/min). IPs maliciosas pueden hacer 20 búsquedas para mapear empleados, pero no pueden crear solicitudes maliciosas a escala.

**Decisión**: 
- `checkRateLimit(ip, "apuntarse-empleado-lookup", 20, 60_000)` en `buscarEmpleadoPorDniAction`
- `checkRateLimit(ip, "apuntarse-empleado-crear", 10, 60_000)` en `crearSolicitudEmpleadoAction`

---

### Cálculo de huecos: unificar voluntarios + empleados

Razón: una caseta puede tener plazas mixtas (3 voluntarios + 2 contratados). Los huecos no son independientes.

**Decisión**: Nueva función `calcularHuecosUnificado(tx, edicionId, opts?: { incluirVoluntarios?, incluirEmpleados?, turnoIds? }): Map<turnoId, huecos>` que:
- Por defecto suma ambos (total de huecos sin discriminar tipo)
- Opcionalmente filtra solo voluntarios o empleados (para cálculos separados)
- Reutiliza en `/apuntarse/[token]` (antes solo voluntarios, ahora suma ambos)
- RSC páginas pueden seguir usando lo anterior si lo necesitan

**Alternativa descartada**: mantener dos funciones separadas (complejidad innecesaria; mejor una función con flags).

---

### Búsqueda DNI: respuesta uniforme (no revela si no existe vs. rate-limitado)

Razón: privacidad. No revelar si un DNI pertenece a un empleado activo.

**Decisión**: `buscarEmpleadoPorDniAction` siempre retorna `{ encontrado: bool, datos?: {...} }` independientemente del motivo (no existe, inactivo, rate-limitado, error BD). El cliente interpreta "no encontrado" igual para todos los casos. El log de auditoría registra el caso real.

---

### Página RSC análoga a voluntarios con DNI obligatorio

Razón: empleados no tienen "entidad" como voluntarios; el DNI es el identificador único de búsqueda.

**Decisión**: Estructurar RSC `/apuntarse-empleado/[token]/page.tsx` paralela a voluntarios pero sin selector de entidad (ya está en Empleado.entidad si aplica). Flujo: buscar DNI → autorrellena nombre/apellidos/email → selecciona turnos → envía.

---

### Crear Empleado nuevo en `aprobarSolicitudEmpleadoAction` si DNI no existe

Razón: formulario empleado puede traer gente nueva (reclutamiento sobre la marcha). Admins aprueban → se crea empleado automáticamente.

**Decisión**: En acción aprobación:
- Query `Empleado.findUnique({ where: { dni } })`
- Si existe: actualizar datos (nombre, apellidos, email, telefono) + crearasignaciones
- Si no existe: crear `Empleado` nuevo con `esVoluntario=false`, `activo=true`, luego crear asignaciones

---

## Convenciones a respetar en el plan

- **Idioma del plan**: Español.
- **Stack del proyecto**: Next.js 16 (App Router), React 19, Tailwind 4, Prisma 7, Zod 4, TypeScript 5 strict.
- **Patrón de tests**: Jest para integración, Playwright para E2E. Reutilizar fixtures/seeding existente.
- **Patrón de Server Actions**: `"use server"` → `requireRole()` (si aplica) → `parseForm(Zod)` → Prisma transaction → `revalidatePath()` → `{ ok, data?, error?, fieldErrors? }`.
- **Rate-limit**: IP-based, respuesta uniforme para seguridad.
- **Audit**: `withAuditContext("public:apuntarse-empleado", fn)` para acciones públicas.
- **Errores**: Validación en bordes (Zod + input usuario); no para casos imposibles.
- **Migrations**: Usar `npx prisma migrate dev --name "add SolicitudEmpleado models"` antes de cada cambio major en schema.
- **Commits**: Angular style (`feat(db): ...`, `feat(turnos): ...`, `test(...)`); nueva rama `feature/d5-formulario-empleados` si lo requiere.
- **Integración posterior**: Al terminar desarrollo, usar skill `close-development` para PR + scale-down + Jira READY TO PROD.

