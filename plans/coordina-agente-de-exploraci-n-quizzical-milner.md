# Recon: 6 desarrollos cross-cutting (paginación, lenguaje inclusivo, dashboard, permisos, formulario empleados público, persistencia form state)

> **Brief de contexto para `superpowers:writing-plans`.** Este documento NO es el plan final; es el material que `writing-plans` usará para redactarlo. Idioma del plan final: español.

## Spec original

El usuario quiere planificar 6 desarrollos en el proyecto **caseta** (Next.js 16 + Prisma 7 + PostgreSQL/Neon + Better Auth + shadcn/ui):

1. **Paginación universal en listados** + selector de elementos por página + ordenación por columnas. Aplica a TODOS los listados.
2. **Lenguaje inclusivo** en todos los literales/mensajes.
3. **Dashboard**: los KPIs de ingresos y gastos deben mostrar los **totales de la edición activa**, no del día actual.
4. **Matriz de permisos**: definir matriz granular y crear nueva pestaña en `/admin` para asignar permisos a roles/perfiles. Hoy hay 3 roles fijos en código.
5. **Formulario público de empleados** (análogo al de voluntarios `/apuntarse/[token]`): muestra turnos cuyo `tipoEmpleado.esVoluntario = false`, pide DNI con autocompletado si el DNI ya existe en BD, queda pendiente de validación administrativa.
6. **Persistencia de datos en formularios con error**: si la validación falla, los datos introducidos NO deben perderse. Aplica a TODOS los formularios.

## Hallazgos del Explorador

### 1. Listados existentes (14 detectados, NINGUNO con paginación)

| Ruta | Componente | UI | Pag. | Orden | Filtros |
|---|---|---|---|---|---|
| `/empleados` | `EmpleadoCard` | Cards | NO | nombre asc | q, tipoId, soloActivos |
| `/admin/usuarios` | `Table` shadcn | Table | NO | email/nombre asc | — |
| `/admin/ediciones` | `Table` shadcn | Table | NO | activa/año desc | — |
| `/admin/casetas` | `Table` shadcn | Table | NO | nombre asc | — |
| `/admin/tipos-empleado` | `Table` shadcn | Table | NO | orden asc | — |
| `/admin/entidades` | `Table` shadcn | Table | NO | activa/nombre asc | — |
| `/admin/proveedores` | `Table` shadcn | Table | NO | nombre asc | — |
| `/admin/solicitudes` | Cards | Cards | NO | fecha desc | estado, edicionId |
| `/caja/cierres` | `Table` shadcn | Table | NO | fecha/caseta asc | — |
| `/caja/gastos` | `Table` shadcn | Table | NO | fecha/created desc | caseta |
| `/caja/nominas` | `Table` shadcn | Table | NO | pagada/nombre asc | — |
| `/inventario/productos` | `Table` shadcn | Table | NO | activo/caseta/nombre | caseta |
| `/inventario/pedidos` | `Table` shadcn | Table | NO | fecha desc | — |
| `/inventario/movimientos` | `Table` shadcn | Table | NO | fecha desc | caseta/producto/tipo/rango (`take:200` HARD-CODED) |
| `/turnos/asistencias` | `tabla-asistencias.tsx` | Table | NO | expandible por fila | — |

NO existe `<DataTable>` genérico. NO existen componentes de paginación en [`app/src/components/ui/`](app/src/components/ui/).

### 2. Patrón de Server Actions y queries

- **Carga**: Server Components en `page.tsx` con `searchParams: Promise<{...}>` (Next 16) → `prisma.X.findMany`. No hay helper genérico de paginación.
- **`ActionResult<T>`** confirmado en [`app/src/lib/action-result.ts`](app/src/lib/action-result.ts):
  ```ts
  type ActionResult<T = undefined> =
    | { ok: true; data: T }
    | { ok: false; error: string; fieldErrors?: FieldErrors };
  ```
- **Validación**: `parseForm(schema, formData)` con Zod 4 + `toActionError()` para mapear `ZodError → fieldErrors`.

### 3. Formulario público voluntarios — referencia para empleados

- Ruta: [`app/src/app/apuntarse/[token]/`](app/src/app/apuntarse/[token]/)
  - `page.tsx`, `actions.ts`, `schema.ts`, `_components/formulario-voluntario.tsx`
- **Token**: `Edicion.formularioToken` (único). Requiere `edicion.activa = true`.
- **Filtro plazas**: `tipoEmpleado.esVoluntario = true`.
- **Validaciones**: `detectarSolape`, `calcularHuecosVoluntario`, rate-limit 10/min/IP.
- **Estado**: crea `SolicitudVoluntario` (pendiente) + `SolicitudVoluntarioTurno[]`.
- **Aprobación**: `/admin/solicitudes`.
- **PROBLEMA detectado**: el formulario actual NO preserva los checkboxes de turnos tras error (sí preserva nombre/email/teléfono via `defaultValue`).

### 4. Modelo `Empleado`

- `dni` UNIQUE nullable, `esVoluntario` bool, `entidadId` FK nullable.

### 5. Modelo `TipoEmpleado` (perfiles)

- Editable. `esVoluntario:bool`, `slug` único.

### 6. Dashboard

- [`app/src/app/(app)/page.tsx`](app/src/app/(app)/page.tsx) + [`app/src/app/(app)/_lib/dashboard.ts`](app/src/app/(app)/_lib/dashboard.ts).
- KPIs actuales: Ingresos·hoy (CierreDiario fecha=HOY), Gastos·edición (todos), Neto, Ingresos·edición.
- **Inconsistencia**: ingresos del KPI principal son SOLO HOY pero gastos son de toda la edición.
- Helper `obtenerEdicionActiva()` en [`app/src/lib/edicion.ts`](app/src/lib/edicion.ts).

### 7. Roles y permisos

- Enum Prisma `Rol { admin, gerente, cajero }` en [`app/prisma/schema.prisma`](app/prisma/schema.prisma).
- `requireRole()` en [`app/src/lib/authz.ts`](app/src/lib/authz.ts). Permisos hard-coded: `if (user.rol === "admin")`.
- NO hay matriz granular ni administración de permisos en UI.

### 8. Formularios — patrón canónico

- `useActionState` (Next 15+) + Zod + `defaultValue` en `<Input>`.
- Funciona para campos de texto. Falla en checkboxes de turnos del voluntario.

### 9. i18n

- NO hay sistema. Strings hardcoded en español en JSX.
- Targets identificados para inclusividad: `/caja/nominas`, `/admin/entidades`, sidebar, formularios admin.

### 10. Convenciones del proyecto

- **Tests**: `vitest run` (backend), `playwright test` (frontend + e2e).
- **Server actions**: sufijo `Action`, en `actions.ts` por carpeta.
- **Componentes**: cliente con `"use client"`, RSC por defecto, `_components/` por ruta.
- **Estructura**:
  ```
  src/
    app/(app)/...      # rutas protegidas
    app/apuntarse/...  # rutas públicas con token
    components/ui/     # shadcn
    lib/               # authz, action-result, validators, audit, edicion...
    prisma/schema.prisma
  ```

## Análisis del Analista

### D1 — Paginación universal

**Tareas atómicas**:
- 1.1 — Crear [`app/src/lib/list-params.ts`](app/src/lib/list-params.ts) (nuevo): `parseListParams(searchParams, { defaults, allowedSorts, allowedPageSizes })` → `{ page, pageSize, sort, order, skip, take }`. Whitelist `pageSize ∈ {10,25,50,100}`.
- 1.2 — Crear [`app/src/components/ui/data-table-pagination.tsx`](app/src/components/ui/data-table-pagination.tsx) (nuevo): Server-friendly, links con searchParams. Props: `page`, `pageSize`, `total`, `basePath`. Renderiza prev/next + "X–Y de Z".
- 1.3 — Crear [`app/src/components/ui/page-size-select.tsx`](app/src/components/ui/page-size-select.tsx) (nuevo): cliente, `useRouter` + `useSearchParams`, resetea `page=1`.
- 1.4 — Crear [`app/src/components/ui/sortable-header.tsx`](app/src/components/ui/sortable-header.tsx) (nuevo): cliente, alterna asc→desc→neutro.
- 1.5 — Tests unitarios de `parseListParams` en [`app/src/lib/list-params.test.ts`](app/src/lib/list-params.test.ts) (nuevo).
- 1.6–1.20 — Aplicar paginación + orden en cada uno de los 14 listados (`page.tsx` correspondiente). Reemplazar `findMany` por `findMany({skip,take,orderBy})` + `count()` paralelos con `Promise.all`. `/inventario/movimientos` quita `take:200`.
- 1.21 — Test e2e en [`app/e2e/pagination.spec.ts`](app/e2e/pagination.spec.ts) (nuevo): navegación con `?page=2&pageSize=25&sort=nombre&order=asc`.

**Dependencias**: 1.1+1.2+1.3+1.4 → 1.6..1.20 (paralelos). 1.5 paralelo. 1.21 al final.

**Riesgos**:
- `count()` extra dobla queries → `Promise.all`, aceptable a 2-5 usuarios.
- Orden dinámico sin whitelist permite SQL injection vía `orderBy` → whitelist obligatoria.
- `/inventario/movimientos` con `take:200` puede ocultar bug si alguien dependía del límite → revisar consumidores.

### D2 — Lenguaje inclusivo

**Tareas atómicas**:
- 2.1 — Inventario grep de literales con género masculino genérico.
- 2.2 — Definir glosario de reemplazos en `plans/glosario-inclusivo.md` (nuevo). Aprobar con usuario.
- 2.3 — Aplicar en sidebar/navbar.
- 2.4 — Aplicar en módulo Turnos.
- 2.5 — Aplicar en módulo Empleados/Voluntarios + flujo público.
- 2.6 — Aplicar en módulo Caja.
- 2.7 — Aplicar en módulo Inventario.
- 2.8 — Aplicar en módulo Admin.
- 2.9 — Aplicar en mensajes de error de Server Actions (ZodError messages, action results).
- 2.10 — Aplicar en mensajes de Better Auth si los hay ([`app/src/lib/auth.ts`](app/src/lib/auth.ts)).

**Dependencias**: 2.1 → 2.2 → 2.3..2.10 (paralelos).

**Riesgos**: estilos mezclados si distintos módulos divergen → glosario centralizado obligatorio. Tests con strings hardcoded en aserciones → grep tests.

### D3 — Dashboard: KPIs por edición activa

**Tareas atómicas**:
- 3.1 — Modificar `loadDashboard` en [`app/src/app/(app)/_lib/dashboard.ts`](app/src/app/(app)/_lib/dashboard.ts): ingresos agregan `CierreDiario.totalIngresos` por `edicionId` activa, NO por fecha=HOY.
- 3.2 — Renombrar etiquetas KPI en [`app/src/app/(app)/page.tsx`](app/src/app/(app)/page.tsx): "Ingresos edición" / "Gastos edición" / "Neto edición".
- 3.3 — **ELIMINAR** el KPI "Ingresos · hoy" (decisión confirmada por usuario).
- 3.4 — Test integración en [`app/src/app/(app)/_lib/dashboard.test.ts`](app/src/app/(app)/_lib/dashboard.test.ts) (nuevo): suma cierres por edición activa, no incluye edición anterior.

**Dependencias**: 3.1 → 3.2 → 3.3 → 3.4.

**Riesgos**: si no hay edición activa, query falla → fallback con `obtenerEdicionActiva()` y ocultar KPI.

### D4 — Matriz de permisos

**Tareas atómicas**:
- 4.1 — Catálogo de permisos en [`app/src/lib/permissions/catalog.ts`](app/src/lib/permissions/catalog.ts) (nuevo). Constantes tipo `'empleados.editar'`, `'caja.cierre.crear'`, `'caja.cierre.bloquear'`, `'admin.usuarios.crud'`, `'admin.permisos.editar'`, etc. Mapear desde inventario de `requireRole`.
- 4.2 — Inventario grep de checks `requireRole` y `user.rol === "..."` actuales.
- 4.3 — Migración Prisma: modelo `RolPermiso { rol Rol, permiso String, @@unique([rol, permiso]) }` en [`app/prisma/schema.prisma`](app/prisma/schema.prisma).
- 4.4 — Seed inicial idempotente en [`app/prisma/seed.ts`](app/prisma/seed.ts) reproduciendo los `requireRole` actuales.
- 4.5 — Helper `loadPermisosForRol(rol)` en [`app/src/lib/permissions/runtime.ts`](app/src/lib/permissions/runtime.ts) (nuevo) cacheado per-request con `cache()` de React.
- 4.6 — Helper `requirePermiso(clave)` en [`app/src/lib/authz.ts`](app/src/lib/authz.ts) que internamente hace `loadPermisosForRol(user.rol).has(clave)`. Hard-rule: `if (user.rol === "admin") return true`.
- 4.7 — Migrar checks dispersos de `requireRole` → `requirePermiso` archivo por archivo (lista del 4.2).
- 4.8 — Página `/admin/permisos/page.tsx` (nuevo): tabla rol×permiso con checkboxes server-rendered.
- 4.9 — `actions.ts` en `/admin/permisos/`: `actualizarPermisoAction(rol, permiso, activo)`. Requiere `admin.permisos.editar`. Escribe `AuditLog`.
- 4.10 — Entrada de menú a `/admin/permisos`. Visible solo si `requirePermiso('admin.permisos.editar')`.
- 4.11 — Tests integración en [`app/src/lib/permissions/permissions.test.ts`](app/src/lib/permissions/permissions.test.ts) (nuevo): admin todo, gerente sin nóminas, cambio dinámico no deja stale.
- 4.12 — Test e2e en [`app/e2e/permisos.spec.ts`](app/e2e/permisos.spec.ts) (nuevo): admin asigna permiso, gerente lo usa.

**Dependencias**: 4.1+4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.7 (paralelo a 4.8+4.9+4.10) → 4.11+4.12.

**Riesgos**:
- Migración 4.7 puede perder checks → 4.2 inventario obligatorio.
- Admin sin permisos por error en UI → hard-rule en 4.6.
- Cambio en tabla no invalida caché Better Auth → consultamos `RolPermiso` per-request, no cacheamos en sesión.

### D5 — Formulario público empleados

**Tareas atómicas**:
- 5.1 — Crear [`app/src/app/apuntarse-empleado/[token]/page.tsx`](app/src/app/apuntarse-empleado/[token]/page.tsx) (nuevo). Reutiliza `Edicion.formularioToken`. Filtra plazas con `tipoEmpleado.esVoluntario = false`.
- 5.2 — Migración Prisma: nuevos modelos `SolicitudEmpleado` + `SolicitudEmpleadoTurno` (espejo de los de voluntario, con campos propios de empleado).
- 5.3 — Crear [`app/src/app/apuntarse-empleado/[token]/_lib/huecos-empleado.ts`](app/src/app/apuntarse-empleado/[token]/_lib/huecos-empleado.ts) (nuevo) análogo a `calcularHuecosVoluntario`. `detectarSolape` debe consultar AMBAS tablas de solicitudes.
- 5.4 — Schema Zod en [`app/src/app/apuntarse-empleado/[token]/schema.ts`](app/src/app/apuntarse-empleado/[token]/schema.ts) (nuevo): `dni` obligatorio, nombre, apellidos, telefono, email, turnos[].
- 5.5 — Server action `buscarEmpleadoPorDniAction(dni, _token)` en [`app/src/app/apuntarse-empleado/[token]/actions.ts`](app/src/app/apuntarse-empleado/[token]/actions.ts) (nuevo). Match exacto, solo `activo=true && esVoluntario=false`. Rate-limit 20/min/IP. Respuesta uniforme `{ encontrado: bool, datos?: { nombre, apellidos, telefono?, email? } }` (no diferencia "no existe" de "rate-limited"). Requiere token de edición activa.
- 5.6 — Server action `crearSolicitudEmpleadoAction(formData)`. Replica patrón voluntario con rate-limit 10/min/IP. Crea `SolicitudEmpleado` (estado pendiente) + `SolicitudEmpleadoTurno[]`.
- 5.7 — Componente cliente [`app/src/app/apuntarse-empleado/[token]/_components/formulario-empleado.tsx`](app/src/app/apuntarse-empleado/[token]/_components/formulario-empleado.tsx) (nuevo). On blur de DNI → llama 5.5 → autorrellena. Preserva valores en error (D6 patrón).
- 5.8 — Modificar [`app/src/app/(app)/admin/solicitudes/page.tsx`](app/src/app/(app)/admin/solicitudes/page.tsx): añadir tab/sección "Empleados" mostrando `SolicitudEmpleado` además de voluntarios.
- 5.9 — Acción `aprobarSolicitudEmpleadoAction` en [`app/src/app/(app)/admin/solicitudes/actions.ts`](app/src/app/(app)/admin/solicitudes/actions.ts): si DNI ya existe, actualiza datos + crea `Asignacion[]`; si no, crea `Empleado` con `esVoluntario=false` + `Asignacion[]`.
- 5.10 — Tests integración en [`app/src/app/apuntarse-empleado/[token]/actions.test.ts`](app/src/app/apuntarse-empleado/[token]/actions.test.ts) (nuevo): DNI nuevo, DNI existente, solape, turno de voluntario rechazado, oracle de DNI con rate-limit.
- 5.11 — Test e2e en [`app/e2e/apuntarse-empleado.spec.ts`](app/e2e/apuntarse-empleado.spec.ts) (nuevo).

**Dependencias**: 5.2 → 5.1 → 5.3+5.4+5.5 (paralelos) → 5.6 → 5.7 → 5.8+5.9 → 5.10+5.11.

**Riesgos**:
- **Enumeración de DNIs**: rate-limit 20/min/IP + respuesta uniforme + bucket nuevo `apuntarse-empleado-lookup`.
- Solape entre solicitud empleado y voluntario para mismo turno → `detectarSolape` consulta ambas tablas.
- DNI duplicado por error histórico (campo nullable) → validar en aprobación.
- Si empleado existente tiene `esVoluntario=true`, rechazar (no es elegible para este formulario).

### D6 — Persistencia de datos en formularios

**Tareas atómicas**:
- 6.1 — Inventario de formularios (lista archivo + tipos de inputs).
- 6.2 — Extender `ActionResult` en [`app/src/lib/action-result.ts`](app/src/lib/action-result.ts): añadir campo opcional `values?: Record<string, unknown>`.
- 6.3 — Helper `formDataToObject(formData)` en [`app/src/lib/forms.ts`](app/src/lib/forms.ts) (nuevo) que serializa FormData incluyendo arrays multivalor (checkboxes con mismo `name`). Blacklist hard-coded: `password`, `passwordConfirm`, `token`, archivos.
- 6.4 — Patrón en cada `actions.ts`: en error retornar `{ ok:false, error, values: formDataToObject(formData) }` (manual, no wrapper).
- 6.5 — Patrón en cada formulario cliente: leer `state?.values` con `useActionState` y pasarlo como `defaultValue` / `defaultChecked` (solo cuando `ok===false`).
- 6.6 — Arreglar checkboxes de turnos en [`app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx`](app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx) + su `actions.ts`.
- 6.7 — Aplicar a forms admin (usuarios, casetas, ediciones, tipos-empleado, entidades, proveedores).
- 6.8 — Aplicar a forms caja (cierres, gastos, nóminas).
- 6.9 — Aplicar a forms inventario (productos, pedidos, movimientos).
- 6.10 — Aplicar a forms turnos (asignación).
- 6.11 — Aplicar a formulario empleados nuevo (depende de 5.7).
- 6.12 — Tests e2e en [`app/e2e/forms-persist.spec.ts`](app/e2e/forms-persist.spec.ts) (nuevo): texto, checkbox, multi-checkbox, select, date, textarea.
- 6.13 — Tests unitarios de `formDataToObject` en [`app/src/lib/forms.test.ts`](app/src/lib/forms.test.ts) (nuevo).

**Dependencias**: 6.1 → 6.2 → 6.3 → 6.4+6.5 (patrón) → 6.6..6.11 (paralelos) → 6.12+6.13. 6.11 depende de 5.7.

**Riesgos**:
- Filtrar PII/credenciales en `values` → blacklist.
- Inputs date/time/datetime-local requieren formato ISO específico → tests por tipo.
- Cambiar `ActionResult` rompe consumidores → campo `values` opcional, no breaking.

### Plan de tests consolidado

| Caso | Tipo | Archivo |
|---|---|---|
| `parseListParams` clamp/whitelist/defaults | unit | [list-params.test.ts](app/src/lib/list-params.test.ts) |
| Paginación URL navegable + orden alterna | e2e | [pagination.spec.ts](app/e2e/pagination.spec.ts) |
| Dashboard agrega por edición activa | integration | [dashboard.test.ts](app/src/app/(app)/_lib/dashboard.test.ts) |
| `hasPermission` por rol + cambio dinámico | integration | [permissions.test.ts](app/src/lib/permissions/permissions.test.ts) |
| Admin asigna permiso → gerente lo usa | e2e | [permisos.spec.ts](app/e2e/permisos.spec.ts) |
| Apuntarse empleado: DNI nuevo/existente, solape, oracle | integration | [apuntarse-empleado/[token]/actions.test.ts](app/src/app/apuntarse-empleado/[token]/actions.test.ts) |
| Flujo público empleado E2E | e2e | [apuntarse-empleado.spec.ts](app/e2e/apuntarse-empleado.spec.ts) |
| `formDataToObject` con arrays + blacklist | unit | [forms.test.ts](app/src/lib/forms.test.ts) |
| Persistencia tipos input | e2e | [forms-persist.spec.ts](app/e2e/forms-persist.spec.ts) |

### Dependencias inter-desarrollo y orden recomendado

D2 → D6 → D1 → D3 → D4 → D5

- D6 antes de D5 → el formulario nuevo nace con persistencia.
- D4 al final por alcance transversal (toca todos los `actions.ts`); evita conflictos de merge con D1/D5/D6.
- D2 antes de D1 → los paginadores nacen con copy correcto.
- D3 es independiente; encaja en cualquier momento.

## Decisiones arquitectónicas

### Eje 1 — Abstracción

1. **Paginación**: helpers compuestos (`parseListParams` + `<DataTablePagination>` + `<SortableHeader>` + `<PageSizeSelect>`), NO un `<DataTable>` genérico. Justificación: 14 listados heterogéneos (12 tablas + 2 cards), cada `page.tsx` ya tiene su `findMany` con includes propios; un genérico forzaría reescribir todos. Helpers se inyectan sin romper RSC.
2. **Persistencia form state**: aplicación manual del patrón `values` en cada `actions.ts` + helper `formDataToObject`, NO wrapper global. Justificación: ~30 forms con shapes Zod muy distintos; un wrapper genérico sobre `parseForm` perdería tipado de `ActionResult<T>`. Coste boilerplate (3-4 líneas/action) menor que mantener abstracción.
3. **`pageSize`**: default global `25`, override por listado vía constante local. Persistencia **solo URL** (`?page=&pageSize=&sort=&order=`). Sin cookie. Justificación: 2-5 usuarios, URL state encaja con el patrón actual de `searchParams`.

### Eje 2 — Persistencia y modelos

4. **Permisos**: **híbrido**. Catálogo de permisos en JSON estático ([`app/src/lib/permissions/catalog.ts`](app/src/lib/permissions/catalog.ts) nuevo) + asignación rol→permiso en BD nueva tabla `RolPermiso { rol Rol, permiso String, @@unique([rol, permiso]) }`. **Editable en runtime desde `/admin/permisos`** (decisión usuario). Justificación: catálogo es código (cada `requireRole` se sustituye por `requirePermiso("clave")`); asignación es dato editable.
5. **Granularidad**: solo por **rol**. Sin overrides por usuario. Justificación: 2-5 usuarios totales; si surge excepción se crea un rol nuevo. Enum `Rol` permanece intacto.
6. **Caché `hasPermission`**: AsyncLocalStorage / `cache()` de React **per-request**. Carga única `Map<Rol, Set<permiso>>` al inicio. Justificación: alineado con patrón existente `withAuditContext`. Volumen mínimo (3 roles × ~30 permisos). Mutaciones en `/admin/permisos` no requieren invalidación: el siguiente request recarga.
7. **Modelos solicitud**: `SolicitudEmpleado` + `SolicitudEmpleadoTurno` **separados** de los de voluntario. Justificación: campos disjuntos (DNI obligatorio, jornal vs entidad), aprobación distinta (match por DNI vs alta nueva). Mezclar fuerza nullables y refines frágiles.
8. **Token formulario empleado**: **reutilizar** `Edicion.formularioToken`. Discriminación por ruta: `/apuntarse/[token]` vs `/apuntarse-empleado/[token]`. Justificación: el token identifica edición, no tipo de formulario. Rotarlos coordinadamente es peor.

### Eje 3 — Seguridad y semántica

9. **Enumeración DNIs**: action server con (a) match exacto + filtro `activo=true && esVoluntario=false`, (b) rate-limit 20/min/IP en bucket nuevo `apuntarse-empleado-lookup`, (c) respuesta uniforme `{ encontrado, datos? }` sin distinguir "no existe" de rate-limited, (d) requiere token de edición activa, (e) no devolver IDs internos.
10. **Lenguaje inclusivo**: **mezcla pragmática** (decisión usuario). Glosario decide caso por caso: colectivo donde quede natural ("personal", "plantilla", "cuenta"), desdoble ("empleadas/os") solo donde el colectivo suene forzado o el desdoble resulte más claro. El glosario debe aprobarse antes del barrido.
11. **i18n**: **NO introducir `next-intl`** ahora. Mantener strings hardcoded; aplicar solo el cambio léxico de D2. Justificación: la spec no pide multilenguaje; introducir capa triplica el alcance.
12. **KPI "Ingresos · hoy"**: **eliminar** (decisión usuario). Solo KPIs por edición activa. La spec ("mejor mostrar los totales de la edición") apoya el reemplazo puro.

### Coherencia global

Las 12 decisiones convergen en: **mínima abstracción nueva, máximo aprovechamiento de patrones existentes** (`ActionResult`, `parseForm`, `requireRole`→`requirePermiso`, `withAuditContext`, `rate-limit`, `formularioToken`, `useActionState`+`defaultValue`). Para 2-5 usuarios concurrentes, evitar genéricos pesados (D1 helpers vs DataTable, D2 manual vs wrapper, D5 solo rol, D11 sin i18n) que cobran su precio en mantenibilidad sin amortizarse.

Las únicas piezas nuevas reales son: tabla `RolPermiso` con catálogo en código (D4+D6), modelos espejo `SolicitudEmpleado`/`SolicitudEmpleadoTurno` (D7), endpoint público lookup DNI con rate-limit (D9), y 4 helpers pequeños de paginación (D1).

El barrido inclusivo (D2) y la limpieza de KPIs (D12) son cambios léxicos/UX horizontales sin infraestructura. La paginación URL-only (D3) y el patrón manual de `values` (D2) hacen listados y forms uniformes sin ocultar lógica. El token compartido (D8) preserva la analogía 1 edición ↔ 1 formulario público multimodal. Resultado: ~6 tareas plataforma + ~14 tareas aplicación de patrón en listados + ~30 tareas pequeñas de form-state + 1 vertical nueva (alta empleado público).

## Convenciones a respetar en el plan

- **Idioma del plan**: español. `writing-plans` debe ajustar su plantilla por defecto.
- **Stack**: Next.js 16 App Router + React 19 + Prisma 7 + PostgreSQL/Neon + Better Auth 1.6 + shadcn/ui + Zod 4 + TS strict.
- **Patrón Server Actions**: `"use server"` → `requireRole()` o `requirePermiso()` → `parseForm(zod)` → Prisma → `revalidatePath()` → `ActionResult<T>`.
- **AuditLog**: cambios en `RolPermiso` deben pasar por el patrón existente (`AsyncLocalStorage` + `withAuditContext`). El patrón es automático para mutaciones; verificar que se registra.
- **Tests**:
  - Backend: `vitest run` ([`app/src/lib/turnos-solape.test.ts`](app/src/lib/turnos-solape.test.ts), [`app/src/lib/authz.test.ts`](app/src/lib/authz.test.ts) como ejemplos).
  - Frontend/E2E: `playwright test` (con flags `--grep @e2e` y `--grep-invert @e2e`).
- **Naming**: Server actions con sufijo `Action`. Componentes cliente con `"use client"`. Estructura `_components/`, `_lib/`, `actions.ts`, `schema.ts`, `page.tsx` por ruta.
- **Migraciones**: `npx prisma migrate dev --name <nombre>` + `npx prisma generate`. La BD de dev es branch `dev` en Neon.
- **Integración posterior**: cuando todo el desarrollo termine, usar `close-development` para PR + scale-down + Jira (no aplica aquí — proyecto sin Jira).
- **Producción**: para subir a prod, `deploy-produccion` skill (lint + build + bump semver + commit `chore(release): vX.Y.Z` + push).
