# Plan: Módulo público de apuntarse voluntarios

## Contexto

La feria capta 30-50 voluntarios por edición. Hoy todas las asignaciones se hacen a mano desde el backoffice (Server Actions con `requireRole`), lo que no escala cuando hay que orquestar varias casetas y decenas de turnos. Este módulo abre un formulario **público** (sin login) por edición, accedido por URL con token opaco, donde los voluntarios solicitan huecos de turno con perfil `voluntario`. Las solicitudes quedan **pendientes** hasta que un `admin`/`gerente` las apruebe o rechace desde `/admin/solicitudes`.

**Por qué ahora**: la Fase 5 cerró inventario; la operación ya tiene turnos, empleados, cierres y nóminas — pero la captación de personal voluntario sigue siendo manual. Antes de que la primera feria real lo ponga a prueba, conviene automatizar el flujo más propenso a errores humanos (duplicar voluntarios, doble asignación, olvidar huecos).

**Outcome esperado**: un gerente publica la URL de una edición, la comparte por WhatsApp/redes, y los voluntarios se apuntan solos. El gerente aprueba en lote desde el backoffice; los huecos agotados se bloquean automáticamente y los voluntarios recurrentes se reconcilian por teléfono sin crear duplicados.

**Decisiones ya tomadas con el usuario (no re-litigar):**
- **Acceso**: URL con token opaco por edición, rotable. No hay tokens individuales ni enlace abierto sin token.
- **Identidad del voluntario = teléfono**. El DNI no se pide en el flujo público. Se añade unicidad parcial `(telefono) WHERE perfil='voluntario'` a `Empleado`.
- **Moderación obligatoria**: todo apunte queda `pendiente`; no hay self-service directo. El hueco se **reserva** al crear la solicitud (pendientes cuentan).
- **Lookup público de teléfono DESCARTADO**: se expone el backend a enumeration. El dedupe se hace al aprobar.
- **Empleado se crea al aprobar**, no al enviar. La tabla `Empleado` no se ensucia con solicitudes rechazadas o spam.
- **UI admin**: listado dedicado `/admin/solicitudes` + badge "N pendientes" en el calendario de turnos.
- Reglas: solo turnos con huecos voluntario > 0; rechazar si hay solape entre los turnos elegidos. Sin límite de turnos por persona ni de caseta.
- **Entidad de pertenencia**: nuevo catálogo `EntidadVoluntario` editable desde `/admin/entidades`. Obligatoria para voluntarios (refine cruzado, igual que jornal). Se pide en el form público (desplegable filtrado por `activa=true`) y se traslada al `Empleado` al aprobar. Borrado = **soft-delete** (`activa=false`); las referencias existentes se mantienen.
- **Listado/exportación de asistencias**: nueva pantalla `/turnos/asistencias` agrupada por persona, con turnos asistidos expandibles. Filtros: edición (default = activa del año en curso), perfil (multi-select), entidad, caseta. Exportación a CSV (sin nuevas deps); XLSX se evalúa más adelante si hace falta.

---

## Estado actual relevante

- [app/prisma/schema.prisma](../app/prisma/schema.prisma) — `Empleado.dni` ya es `String? @unique`, `telefono` opcional sin constraint. Enum `PerfilEmpleado` incluye `voluntario`. `TurnoPlaza(turnoId, perfil, cantidad)` modela los huecos esperados.
- [app/src/proxy.ts](../app/src/proxy.ts) — matcher excluye `/login`, `/api/auth`, assets. Sin excepción para rutas públicas de dominio.
- [app/src/lib/turnos-solape.ts](../app/src/lib/turnos-solape.ts) — `detectarSolape` puro, reutilizable sin tocar Prisma.
- [app/src/lib/authz.ts](../app/src/lib/authz.ts) — `requireRole`, `getSession`, `AuthError`.
- [app/src/lib/action-result.ts](../app/src/lib/action-result.ts) — `parseForm`, `toActionError`, `ActionResult<T>`.
- [app/src/lib/audit.ts](../app/src/lib/audit.ts) — `withAuditContext(usuarioId, fn)` lee `AsyncLocalStorage` para el audit log.
- [app/src/app/(app)/turnos/actions.ts](../app/src/app/(app)/turnos/actions.ts) — `asignarEmpleadoAction` ya implementa el patrón transacción + revalidar solape + crear `TurnoEmpleado`. Referencia canónica.
- [app/src/app/(app)/admin/empleados/schema.ts](../app/src/app/(app)/admin/empleados/schema.ts) — patrón `refine` cruzado `voluntario ⇔ jornalDiario null`. Aplicable al nuevo refine de teléfono.
- [app/src/components/ui/](../app/src/components/ui/) — `button`, `input`, `label`, `card`, `badge`, `toaster` disponibles. No hay combobox (suficiente con checkboxes agrupados).
- [app/src/app/(app)/admin/_components/page-header.tsx](../app/src/app/(app)/admin/_components/page-header.tsx) — `FieldError` y `FormError`.
- No existe en el proyecto ningún endpoint público de dominio, ni tokens, ni rate limit. Todo eso es nuevo.

---

## Arquitectura del módulo

### Segmentación de rutas

```
app/src/app/
  apuntarse/[token]/                  ← PÚBLICO (fuera del grupo (app))
    page.tsx                          ← RSC: resuelve token → edición → turnos con huecos
    actions.ts                        ← crearSolicitudAction (sin requireRole)
    schema.ts                         ← Zod público
    gracias/page.tsx                  ← landing post-envío
    _components/formulario-voluntario.tsx
  (app)/admin/
    solicitudes/                      ← NUEVO
      page.tsx
      actions.ts                      ← aprobar/rechazar (requireRole)
      schema.ts
      _components/acciones.tsx
    ediciones/                        ← MODIFICAR
      actions.ts                      ← + publicar/despublicar/rotar token
      _components/publicar-formulario.tsx  ← NUEVO
    entidades/                        ← NUEVO (catálogo entidades voluntarios)
      page.tsx
      actions.ts                      ← crear/renombrar/activar/desactivar
      schema.ts
      _components/entidad-form.tsx
```

### Cálculo centralizado de huecos

El invariante clave: **un hueco voluntario está disponible cuando `TurnoPlaza(voluntario).cantidad > TurnoEmpleado(perfil=voluntario) + SolicitudVoluntarioTurno(pendiente)`**. Las solicitudes pendientes reservan hueco. Este cálculo se usa en tres sitios (listado público, crear solicitud, aprobar solicitud) y debe vivir en UN helper:

- `app/src/app/(app)/turnos/_lib/huecos.ts` → `calcularHuecosVoluntario(tx, edicionId, opts?)` devuelve `Map<turnoId, huecosLibres>`.

### Seguridad del endpoint público

- Token: `crypto.randomBytes(18).toString("base64url")` (~24 chars). Lookup por `findUnique({ formularioToken })`.
- Rate limit in-memory LRU: `Map<ip, { count, resetAt }>` en `app/src/lib/rate-limit.ts`. 10 req/min/IP para `crearSolicitudAction`. IP desde `headers()` (`x-forwarded-for` primer valor, fallback `x-real-ip`). Reset 60 s. En serverless se resetea por instancia — aceptable dado el volumen.
- Sin lookup público de teléfono (enumeration). El voluntario escribe nombre; dedupe al aprobar.
- CSRF: Next Server Actions validan `Origin` vs `Host` por defecto. Confirmar que no se ha deshabilitado globalmente.
- `withAuditContext("public:apuntarse", ...)` para solicitudes anónimas. `withAuditContext(user.id, ...)` para decisiones de admin.
- 404 consistente (token inválido, edición inactiva, edición sin publicar) para no revelar si el token existía.

---

## Sub-fases y commits

### Fase A — Schema + infraestructura común (bloqueante para B/C/D)

**Schema Prisma** ([app/prisma/schema.prisma](../app/prisma/schema.prisma)):

```prisma
model Edicion {
  // ... campos existentes ...
  formularioToken String? @unique
  solicitudesVoluntario SolicitudVoluntario[]
}

model EntidadVoluntario {
  id        String   @id @default(cuid())
  nombre    String   @unique
  activa    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  empleados   Empleado[]
  solicitudes SolicitudVoluntario[]

  @@index([activa, nombre])
}

model Empleado {
  // ... campos existentes ...
  entidadId String?
  entidad   EntidadVoluntario? @relation(fields: [entidadId], references: [id], onDelete: Restrict)
}

enum EstadoSolicitud {
  pendiente
  aprobada
  rechazada
  cancelada
}

model SolicitudVoluntario {
  id                String          @id @default(cuid())
  edicionId         String
  nombre            String
  telefono          String
  entidadId         String
  observaciones     String?         @db.Text
  estado            EstadoSolicitud @default(pendiente)
  createdAt         DateTime        @default(now())
  decididaAt        DateTime?
  decididaPorUserId String?

  edicion     Edicion                    @relation(fields: [edicionId], references: [id], onDelete: Cascade)
  entidad     EntidadVoluntario          @relation(fields: [entidadId], references: [id], onDelete: Restrict)
  decididaPor User?                      @relation(fields: [decididaPorUserId], references: [id], onDelete: SetNull)
  turnos      SolicitudVoluntarioTurno[]

  @@index([edicionId, estado])
  @@index([telefono])
  @@index([entidadId])
}

model SolicitudVoluntarioTurno {
  id          String @id @default(cuid())
  solicitudId String
  turnoId     String

  solicitud SolicitudVoluntario @relation(fields: [solicitudId], references: [id], onDelete: Cascade)
  turno     Turno               @relation(fields: [turnoId], references: [id], onDelete: Cascade)

  @@unique([solicitudId, turnoId])
  @@index([turnoId])
}
```

Añadir inversas: `User.solicitudesDecididas`, `Turno.solicitudesVoluntario`.

**Migración con SQL manual** (índice parcial — Prisma no lo soporta declarativo):
1. `npx prisma migrate dev --create-only --name apuntarse_voluntarios`
2. Editar el `.sql` generado añadiendo al final:
   ```sql
   CREATE UNIQUE INDEX "Empleado_telefono_voluntario_uniq"
     ON "Empleado" ("telefono")
     WHERE perfil = 'voluntario' AND telefono IS NOT NULL;
   ```
3. `npx prisma migrate dev` + `npx prisma generate`.

**Infra nueva**:
- `app/src/lib/rate-limit.ts` — LRU in-memory + `checkRateLimit(ip, bucket, limit, windowMs)`.
- `app/src/app/(app)/turnos/_lib/huecos.ts` — `calcularHuecosVoluntario(tx, edicionId, opts?)`.
- Modificar [app/src/proxy.ts](../app/src/proxy.ts) matcher:
  ```ts
  matcher: ["/((?!login|apuntarse|api/auth|_next/static|_next/image|favicon.ico).*)"]
  ```
- Modificar [app/src/lib/audit.ts](../app/src/lib/audit.ts) si `withAuditContext` no admite string arbitrario como `usuarioId`: aceptar `string | null` y grabarlo tal cual.
- Modificar [app/src/app/(app)/admin/empleados/schema.ts](../app/src/app/(app)/admin/empleados/schema.ts):
  - `.refine(d => d.perfil !== "voluntario" || !!d.telefono, { message: "Teléfono obligatorio para voluntarios", path: ["telefono"] })`.
  - `.refine(d => d.perfil !== "voluntario" || !!d.entidadId, { message: "Entidad obligatoria para voluntarios", path: ["entidadId"] })`.
  - Aceptar `entidadId` como `cuid().optional()` en el schema base. Mismo patrón cruzado que `voluntario ⇔ jornalDiario null`.
- Modificar [app/src/app/(app)/admin/empleados/_components/empleado-form.tsx](../app/src/app/(app)/admin/empleados/_components/empleado-form.tsx) — añadir `<select name="entidadId">` que se muestra solo si `perfil==="voluntario"`. La page padre carga `EntidadVoluntario.findMany({ where: { OR: [{ activa: true }, { id: empleado?.entidadId }] } })` para que en edición siga apareciendo la entidad inactiva del empleado.

**Commit**: `feat(voluntarios): fase A — schema solicitudes, entidad voluntario, índice parcial teléfono y helper huecos`.

### Fase B0 — Catálogo de entidades de voluntarios (bloqueante para C/D)

Archivos nuevos:
- `app/src/app/(app)/admin/entidades/page.tsx` — RSC con `requireRole(["admin","gerente"])`. Lista de `EntidadVoluntario` (activas e inactivas, separadas o con badge). Form inline para crear nueva.
- `app/src/app/(app)/admin/entidades/actions.ts`:
  - `crearEntidadAction({ nombre })` — crear con `activa=true`. Unique constraint sobre `nombre` evita duplicados.
  - `renombrarEntidadAction({ id, nombre })` — actualiza el nombre.
  - `desactivarEntidadAction({ id })` — `activa=false`. NO borra; preserva referencias en `Empleado` y `SolicitudVoluntario`.
  - `reactivarEntidadAction({ id })` — `activa=true`.
- `app/src/app/(app)/admin/entidades/schema.ts` — Zod: `nombre.trim().min(2).max(80)`.
- `app/src/app/(app)/admin/entidades/_components/entidad-form.tsx` — client crear/renombrar.

Modificar:
- Sidebar / topnav en `(app)/_components/` — ítem "Entidades voluntarios" en sección admin (visible a `admin`/`gerente`).

**Seed inicial**: añadir en [app/prisma/seed.ts](../app/prisma/seed.ts) un par de entidades de ejemplo (`"Hermandad del Rocío"`, `"Particular"`) si la tabla está vacía. No es estrictamente necesario pero evita un primer arranque con desplegable vacío que rompería el form público.

**Commit**: `feat(voluntarios): fase B0 — catálogo de entidades de voluntarios`.

### Fase B — Publicación del token desde ediciones

Archivos nuevos/modificados:
- [app/src/app/(app)/admin/ediciones/actions.ts](../app/src/app/(app)/admin/ediciones/actions.ts) — añadir:
  - `publicarFormularioAction(edicionId)` — `requireRole(["admin","gerente"])`, genera token si `formularioToken` es null, lo persiste.
  - `rotarFormularioAction(edicionId)` — igual pero siempre regenera.
  - `despublicarFormularioAction(edicionId)` — `formularioToken = null`.
- `app/src/app/(app)/admin/ediciones/_components/publicar-formulario.tsx` — client component con estado `publicado | no publicado`, botones, URL copiable (`navigator.clipboard.writeText`).
- [app/src/app/(app)/admin/ediciones/page.tsx](../app/src/app/(app)/admin/ediciones/page.tsx) — integrar el componente en la fila de cada edición.

**Commit**: `feat(voluntarios): fase B — publicación de formulario público por edición`.

### Fase C — Formulario público

Archivos nuevos:
- `app/src/app/apuntarse/[token]/page.tsx` — RSC.
  - Busca `Edicion` por `formularioToken`. 404 si null/inexistente/inactiva.
  - Carga `Turno[]` de la edición (a partir de `Date.now()`), con `TurnoPlaza(voluntario)` y conteos, filtra por `huecos > 0` vía `calcularHuecosVoluntario`.
  - Carga `EntidadVoluntario.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } })` para el desplegable.
  - Agrupa por día → caseta → lista de turnos.
- `app/src/app/apuntarse/[token]/schema.ts` — Zod:
  ```ts
  nombre: z.string().trim().min(2).max(120)
  telefono: z.string().trim().regex(/^\+?[0-9 .\-]{6,20}$/)
  entidadId: z.string().cuid()
  observaciones: z.string().trim().max(500).optional()
  turnoIds: z.array(z.string().cuid()).min(1).max(20).refine(a => new Set(a).size === a.length)
  token: z.string().min(20).max(64)
  ```
- `app/src/app/apuntarse/[token]/actions.ts`:
  - `crearSolicitudAction(_prev, formData): Promise<ActionResult<{ id: string }>>`.
  - Flujo: `checkRateLimit` → `parseForm` → transacción:
    1. Revalidar `Edicion` por token + activa.
    2. Revalidar `EntidadVoluntario` por id + `activa=true`. Rechazar con `fieldErrors.entidadId` si fue desactivada después de cargar la página.
    3. Cargar turnos elegidos con `casetaId`, `fechaInicio/Fin` y edicionId; rechazar si alguno no pertenece a la edición.
    4. Validar solape entre los turnos elegidos con `detectarSolape` (tratar el teléfono como "empleadoId sintético").
    5. `calcularHuecosVoluntario(tx, edicionId, { turnoIds })` y rechazar si alguno tiene 0 huecos. Devolver `fieldErrors.turnoIds` con los conflictivos.
    6. `prisma.solicitudVoluntario.create({ data: { ..., entidadId, turnos: { createMany: { data: turnoIds.map(id => ({ turnoId: id })) } } } })`.
  - `withAuditContext("public:apuntarse", ...)`.
  - No redirige — devuelve `{ ok: true, data: { id } }` y el cliente navega a `/apuntarse/[token]/gracias`.
- `app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx` — client:
  - `useActionState(crearSolicitudAction, ...)`.
  - Inputs nombre/teléfono/observaciones + `<select name="entidadId">` con las entidades activas (recibidas como prop). Con `FieldError`/`FormError`.
  - Lista de turnos con checkboxes agrupados por día y caseta.
  - Input hidden `turnoIds` serializado a JSON, o múltiples `<input name="turnoIds" value="...">`.
  - Validación soft de solape en cliente (opcional, no reimplementar — bastará el feedback del servidor).
- `app/src/app/apuntarse/[token]/gracias/page.tsx` — mensaje estático "Recibida, pendiente de aprobación".

**Commit**: `feat(voluntarios): fase C — formulario público /apuntarse/[token]`.

### Fase D — Moderación en backoffice

Archivos nuevos:
- [app/src/app/(app)/admin/solicitudes/page.tsx](../app/src/app/(app)/admin/solicitudes/page.tsx) — RSC:
  - `requireRole(["admin","gerente"])` dentro de la page (layout de admin probablemente ya lo hace — confirmar).
  - Filtros `?estado=pendiente|aprobada|rechazada|cancelada&edicionId=...`.
  - Por cada fila: nombre, teléfono, **entidad**, lista de turnos con caseta + rango horario, observaciones, `createdAt`, botones aprobar/rechazar (solo si `pendiente`).
- [app/src/app/(app)/admin/solicitudes/actions.ts](../app/src/app/(app)/admin/solicitudes/actions.ts):
  - `aprobarSolicitudAction(_prev, formData)` — `requireRole`, transacción:
    1. Cargar solicitud con `turnos.turno` y `entidad`. Rechazar si `estado !== "pendiente"`.
    2. Buscar `Empleado` por `telefono` + `perfil="voluntario"`. Si no existe, crear (`activo=true`, `jornalDiario=null`, `nombre=solicitud.nombre`, `entidadId=solicitud.entidadId`). Si existe pero `entidadId` difiere o es null, **actualizar** `entidadId` con el de la solicitud (la solicitud aprobada es la fuente de verdad más reciente). El índice parcial único en teléfono evita dobles creaciones en race.
    3. Recargar huecos (`calcularHuecosVoluntario` excluyendo la solicitud actual — los huecos que reservaba son los que va a consumir). Si algún turno no tiene sitio ya (race con otra aprobación), rechazar con `fieldErrors.turnos` listando cuáles. Sin mutar estado.
    4. Validar solape con turnos ya asignados al empleado en la misma edición (reusar helper de solape que use `asignarEmpleadoAction`; si está inline, extraerlo a `app/src/app/(app)/turnos/_lib/solape-helpers.ts` en esta fase).
    5. Crear `TurnoEmpleado` por cada turno (`asistio=false`).
    6. Marcar solicitud `estado=aprobada`, `decididaAt=now`, `decididaPorUserId=user.id`.
    7. `revalidatePath("/admin/solicitudes")` + `revalidatePath("/turnos")`.
  - `rechazarSolicitudAction(_prev, formData)` — `requireRole`, marca `rechazada` + `decididaAt/Por`. No toca `Empleado` ni `TurnoEmpleado`.
- [app/src/app/(app)/admin/solicitudes/schema.ts](../app/src/app/(app)/admin/solicitudes/schema.ts) — `{ solicitudId: cuid(), motivo?: string }`.
- `app/src/app/(app)/admin/solicitudes/_components/acciones.tsx` — client con `window.confirm` antes de rechazar.

Modificar:
- [app/src/app/(app)/turnos/page.tsx](../app/src/app/(app)/turnos/page.tsx) — query adicional:
  ```ts
  const pendientes = await prisma.solicitudVoluntario.count({
    where: { edicionId, estado: "pendiente" }
  });
  ```
  Renderizar badge enlazando `/admin/solicitudes?estado=pendiente` (visible a `admin`/`gerente`).
- Navegación: `app/src/app/(app)/_components/` (sidebar o topnav, confirmar ruta) — ítem "Solicitudes" para `admin`/`gerente`.

**Commit**: `feat(voluntarios): fase D — aprobación/rechazo de solicitudes desde backoffice`.

### Fase E — Listado y exportación de asistencias

Independiente de A-D en lo funcional, pero se apoya en el campo `entidadId` (Fase A) y en la noción de "voluntario" tal como queda tras la moderación. Se entrega como commit separado.

Archivos nuevos:
- [app/src/app/(app)/turnos/asistencias/page.tsx](../app/src/app/(app)/turnos/asistencias/page.tsx) — RSC con `requireRole(["admin","gerente"])`. Lee filtros de `searchParams`:
  - `edicionId` — default = `obtenerEdicionActiva()` si no viene en query.
  - `perfiles` — multi-select de `PerfilEmpleado` (CSV en URL: `?perfiles=voluntario,trabajador`). Default = todos.
  - `entidadId` — opcional.
  - `casetaId` — opcional.
  - Query principal:
    ```ts
    prisma.empleado.findMany({
      where: {
        perfil: perfiles.length ? { in: perfiles } : undefined,
        entidadId: entidadId || undefined,
        asignaciones: {
          some: {
            asistio: true,
            turno: {
              edicionId,
              casetaId: casetaId || undefined,
            },
          },
        },
      },
      include: {
        entidad: true,
        asignaciones: {
          where: {
            asistio: true,
            turno: {
              edicionId,
              casetaId: casetaId || undefined,
            },
          },
          include: { turno: { include: { caseta: true } } },
          orderBy: { turno: { fechaInicio: "asc" } },
        },
      },
      orderBy: { nombre: "asc" },
    })
    ```
  - Render: tabla agrupada por persona. Cada fila muestra `nombre`, `perfil` (badge con color de [perfiles.ts](../app/src/app/(app)/turnos/_lib/perfiles.ts)), `entidad?.nombre`, contador de turnos asistidos. Click expande sub-filas con `caseta.nombre`, `fechaInicio`-`fechaFin`.
- [app/src/app/(app)/turnos/asistencias/_components/filtros.tsx](../app/src/app/(app)/turnos/asistencias/_components/filtros.tsx) — client. Form que actualiza `searchParams` vía `router.push`. Multi-select de perfil con checkboxes. Selectores de edición/entidad/caseta cargados como props desde la page.
- [app/src/app/(app)/turnos/asistencias/_components/tabla-asistencias.tsx](../app/src/app/(app)/turnos/asistencias/_components/tabla-asistencias.tsx) — client. Tabla expandible (estado local de filas abiertas).
- [app/src/app/(app)/turnos/asistencias/exportar/route.ts](../app/src/app/(app)/turnos/asistencias/exportar/route.ts) — Route handler GET. Reusa `requireRole`. Acepta los mismos `searchParams`. Ejecuta la misma query y genera CSV en streaming:
  ```
  nombre;perfil;entidad;dni;telefono;caseta;fecha_inicio;fecha_fin
  ```
  Una fila por **asistencia** (no por persona) — formato plano para Excel. Headers: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="asistencias-{edicion.anio}-{ts}.csv"`. Escapado: comillas dobles si el campo contiene `;`, `"` o salto de línea.
- [app/src/lib/csv.ts](../app/src/lib/csv.ts) — helper puro `toCsvRow(values: string[]): string` con escapado RFC 4180 (separador `;` para compatibilidad con Excel ES). Sin dependencias.

Modificar:
- Sidebar / topnav en `(app)/_components/` — añadir ítem "Asistencias" en sección de turnos (visible a `admin`/`gerente`).

Notas de diseño:
- **Filtro de entidad y perfiles mixtos**: los empleados no-voluntarios tienen `entidadId=null`. Si el filtro de entidad está activo y el de perfiles incluye perfiles no-voluntarios, los no-voluntarios no aparecerán (su `entidadId` no matchea). Es el comportamiento correcto — documentar en el header del filtro: *"Filtrar por entidad excluye empleados sin entidad asignada"*.
- **Sin paginación inicial**: 2-5 usuarios y máximo unos cientos de empleados por edición. La query con `include` queda en memoria sin problemas. Si crece, paginar al nivel de empleado (no de asistencia).
- **Exportación reutiliza la misma query**: para garantizar que lo exportado coincide exactamente con lo visible. Extraer a un helper compartido `app/src/app/(app)/turnos/asistencias/_lib/query.ts` con la firma `cargarAsistencias(filtros): Promise<EmpleadoConAsistencias[]>` y usarlo desde la page Y desde el route handler.

**Commit**: `feat(turnos): fase E — listado y exportación CSV de asistencias`.

---

## Ficheros críticos a crear/modificar

**Crear**:
- [app/src/app/apuntarse/[token]/page.tsx](../app/src/app/apuntarse/[token]/page.tsx)
- [app/src/app/apuntarse/[token]/actions.ts](../app/src/app/apuntarse/[token]/actions.ts)
- [app/src/app/apuntarse/[token]/schema.ts](../app/src/app/apuntarse/[token]/schema.ts)
- [app/src/app/apuntarse/[token]/gracias/page.tsx](../app/src/app/apuntarse/[token]/gracias/page.tsx)
- [app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx](../app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx)
- [app/src/app/(app)/admin/solicitudes/page.tsx](../app/src/app/(app)/admin/solicitudes/page.tsx)
- [app/src/app/(app)/admin/solicitudes/actions.ts](../app/src/app/(app)/admin/solicitudes/actions.ts)
- [app/src/app/(app)/admin/solicitudes/schema.ts](../app/src/app/(app)/admin/solicitudes/schema.ts)
- [app/src/app/(app)/admin/solicitudes/_components/acciones.tsx](../app/src/app/(app)/admin/solicitudes/_components/acciones.tsx)
- [app/src/app/(app)/admin/ediciones/_components/publicar-formulario.tsx](../app/src/app/(app)/admin/ediciones/_components/publicar-formulario.tsx)
- [app/src/app/(app)/admin/entidades/page.tsx](../app/src/app/(app)/admin/entidades/page.tsx)
- [app/src/app/(app)/admin/entidades/actions.ts](../app/src/app/(app)/admin/entidades/actions.ts)
- [app/src/app/(app)/admin/entidades/schema.ts](../app/src/app/(app)/admin/entidades/schema.ts)
- [app/src/app/(app)/admin/entidades/_components/entidad-form.tsx](../app/src/app/(app)/admin/entidades/_components/entidad-form.tsx)
- [app/src/app/(app)/turnos/_lib/huecos.ts](../app/src/app/(app)/turnos/_lib/huecos.ts)
- [app/src/app/(app)/turnos/asistencias/page.tsx](../app/src/app/(app)/turnos/asistencias/page.tsx)
- [app/src/app/(app)/turnos/asistencias/_components/filtros.tsx](../app/src/app/(app)/turnos/asistencias/_components/filtros.tsx)
- [app/src/app/(app)/turnos/asistencias/_components/tabla-asistencias.tsx](../app/src/app/(app)/turnos/asistencias/_components/tabla-asistencias.tsx)
- [app/src/app/(app)/turnos/asistencias/_lib/query.ts](../app/src/app/(app)/turnos/asistencias/_lib/query.ts)
- [app/src/app/(app)/turnos/asistencias/exportar/route.ts](../app/src/app/(app)/turnos/asistencias/exportar/route.ts)
- [app/src/lib/csv.ts](../app/src/lib/csv.ts)
- [app/src/lib/rate-limit.ts](../app/src/lib/rate-limit.ts)
- Migración Prisma + SQL del índice parcial.

**Modificar**:
- [app/prisma/schema.prisma](../app/prisma/schema.prisma) — modelo `Edicion`, enum, **modelo `EntidadVoluntario` nuevo**, campo `Empleado.entidadId`, dos modelos nuevos para solicitudes, relaciones inversas en `Turno` y `User`.
- [app/prisma/seed.ts](../app/prisma/seed.ts) — seed de entidades iniciales si la tabla está vacía.
- [app/src/app/(app)/admin/empleados/_components/empleado-form.tsx](../app/src/app/(app)/admin/empleados/_components/empleado-form.tsx) — desplegable de entidad condicional al perfil.
- [app/src/proxy.ts](../app/src/proxy.ts) — matcher.
- [app/src/lib/audit.ts](../app/src/lib/audit.ts) — admitir `usuarioId` string arbitrario ("public:apuntarse") o null.
- [app/src/app/(app)/admin/empleados/schema.ts](../app/src/app/(app)/admin/empleados/schema.ts) — refines: teléfono y entidad obligatorios para voluntario.
- [app/src/app/(app)/admin/ediciones/actions.ts](../app/src/app/(app)/admin/ediciones/actions.ts) — 3 actions nuevas.
- [app/src/app/(app)/admin/ediciones/page.tsx](../app/src/app/(app)/admin/ediciones/page.tsx) — integrar componente publicar-formulario.
- [app/src/app/(app)/turnos/page.tsx](../app/src/app/(app)/turnos/page.tsx) — badge pendientes.
- [app/src/app/(app)/turnos/actions.ts](../app/src/app/(app)/turnos/actions.ts) — si los helpers de solape están inline, extraerlos a `_lib/solape-helpers.ts` al inicio de Fase D.
- Sidebar / topnav en `(app)/_components/` — ítem "Solicitudes".

---

## Reutilización explícita

- **No reinventar autorización**: las actions de backoffice importan [requireRole](../app/src/lib/authz.ts); la action pública NO la llama (es su rasgo definitorio).
- **No reinventar detección de solape**: [detectarSolape](../app/src/lib/turnos-solape.ts) es pura y se usa tanto para validar turnos elegidos por el voluntario (empleadoId sintético = teléfono) como para validar al aprobar contra turnos reales.
- **No reinventar parsing/errores**: `parseForm`, `toActionError`, `ActionResult<T>` de [app/src/lib/action-result.ts](../app/src/lib/action-result.ts) se usan idénticos a como los consume [turnos/actions.ts](../app/src/app/(app)/turnos/actions.ts).
- **No reinventar audit**: `withAuditContext` se extiende para aceptar un string arbitrario en lugar de `userId`, manteniendo la misma firma.
- **No reinventar UI de errores**: `FieldError` + `FormError` del backoffice se reusan tal cual en el form público — son agnósticos a auth.
- **Referencia canónica de patrón**: `asignarEmpleadoAction` en [turnos/actions.ts](../app/src/app/(app)/turnos/actions.ts) — copiar la estructura de transacción + revalidación dentro de tx + creación de `TurnoEmpleado`.
- **Huecos centralizados**: `calcularHuecosVoluntario` es la ÚNICA fuente de verdad. Prohibido calcularlos inline en cualquier otro sitio.
- **Reutilizar `obtenerEdicionActiva`** ([app/src/lib/edicion.ts](../app/src/lib/edicion.ts)) en la page de asistencias para el default del filtro `edicionId`.
- **Reutilizar `perfiles.ts`** ([app/src/app/(app)/turnos/_lib/perfiles.ts](../app/src/app/(app)/turnos/_lib/perfiles.ts)) en los badges del listado de asistencias y en el multi-select de filtros (mismo orden y mismas etiquetas que en el resto de la app).
- **Query de asistencias única**: la page y el endpoint de export usan el mismo `cargarAsistencias(filtros)` para que lo exportado coincida 1:1 con lo visible.

---

## Verificación end-to-end

1. `cd app && npx prisma migrate dev --create-only --name apuntarse_voluntarios` → editar SQL añadiendo el índice parcial → `npx prisma migrate dev` → `npx prisma generate`. `npm run build` sigue pasando.
2. Backoffice (rol admin): en `/admin/entidades` crear 2 entidades (`"Hermandad del Rocío"`, `"Particular"`). Crear edición activa con fechas futuras, caseta, 2 turnos con `TurnoPlaza(voluntario)=3` cada uno. En `/admin/ediciones` pulsar **Publicar formulario** → copiar URL `/apuntarse/<token>`.
3. Navegador incógnito (sin sesión): abrir URL. [proxy.ts](../app/src/proxy.ts) NO redirige a `/login`. La página muestra el desplegable de entidades activas y los turnos agrupados por día → caseta con huecos visibles.
4. Enviar solicitud con teléfono nuevo, entidad seleccionada y 2 turnos no solapados → insertada fila `SolicitudVoluntario(pendiente, entidadId)` + 2 filas pivote. Landing de gracias visible.
5. Enviar otra con 2 turnos que se solapan → error claro en `FormError`, sin crear nada.
6. Rellenar un turno: 3 solicitudes para el mismo turno (mismo u otros teléfonos). La 4ª debe rechazar ese turno específico, mostrando en el error que solo quedan X huecos.
7. Backoffice `/admin/solicitudes`: listado de pendientes con filtros operativos. Badge en `/turnos` muestra conteo correcto.
8. Aprobar la primera → se crea `Empleado` (voluntario, teléfono registrado, **entidadId copiado de la solicitud**) + `TurnoEmpleado` por cada turno. Aprobar otra del mismo teléfono pero distinta entidad → **reusa** el `Empleado` existente y **actualiza** `entidadId` al de la solicitud aprobada (índice parcial único protegió de duplicados).
9. En `/admin/entidades` desactivar una entidad usada por una solicitud pendiente → la solicitud puede aprobarse igualmente (`Restrict` no bloquea reads). Recargar el form público: la entidad desactivada NO aparece en el desplegable. Si alguien tenía la página abierta y elige la inactiva con devtools, la action rechaza con `fieldErrors.entidadId`.
9. Caso race: llenar a mano (backoffice) un turno antes de aprobar una solicitud pendiente sobre él → `aprobarSolicitudAction` devuelve `fieldErrors` listando turnos agotados y NO muta estado.
10. Rechazar solicitud → `estado=rechazada`, `Empleado` no se crea, `TurnoEmpleado` no se toca.
11. Rotar token en ediciones → URL anterior devuelve 404, nueva funciona.
12. 15 submits rápidos al endpoint público → última tanda bloqueada por rate limit.
13. Inspeccionar `AuditLog`: entradas `create` con `usuarioId="public:apuntarse"` por cada solicitud, y con `usuarioId=user.id` por cada aprobación/rechazo.
14. **Asistencias** (Fase E): marcar `asistio=true` en algunos `TurnoEmpleado` (ya existe `toggleAsistenciaAction`). Abrir `/turnos/asistencias` sin query → carga edición activa. Verificar que cada empleado aparece con el contador correcto y que al expandir la fila salen los turnos en orden cronológico.
15. Filtrar por `perfiles=voluntario`: solo aparecen voluntarios. Combinar con `entidadId` de una de las entidades creadas: solo voluntarios de esa entidad. Filtrar por `casetaId`: solo asistencias en esa caseta (un mismo empleado puede aparecer si asistió en varias; aquí solo muestran las de la caseta filtrada).
16. Pulsar **Exportar CSV**: descarga `asistencias-{anio}-{ts}.csv` con una fila por asistencia (no por persona). Abrir en Excel ES con separador `;`: columnas legibles, fechas correctas, nombre con tilde íntegro (UTF-8 con BOM o cabecera correcta).
17. Probar export con un nombre que contenga `;` o comillas dobles: el escapado RFC 4180 lo protege; Excel muestra el campo entero en una sola celda.

---

## Riesgos y decisiones ambiguas

- **Índice parcial único y `@unique` total en DNI**: `Empleado.dni` ya es `@unique`. Al crear un voluntario desde aprobación sin DNI, `dni=null` y el índice único permite múltiples nulls (comportamiento estándar en Postgres). Si en algún momento se decide que el DNI total sea obligatorio, este flujo se rompe — dejar documentado.
- **Race en aprobación cuando 2 admins aprueban a la vez**: la transacción recalcula huecos pero Postgres por defecto está en `READ COMMITTED`. Dos aprobaciones simultáneas al mismo turno con 1 hueco libre pueden sobrevender en 1. Mitigación: `SELECT ... FOR UPDATE` sobre las filas de `TurnoEmpleado` del turno, o `SERIALIZABLE` en la tx. Decisión pragmática: empezar en `READ COMMITTED` aceptando el riesgo (2-3 admins, poca concurrencia real); escalar si aparece el problema.
- **Rate limit in-memory en serverless**: se resetea por instancia. Para el volumen esperado (una feria al año, tráfico concentrado en días) es suficiente, pero no protege contra un atacante distribuido. Alternativa futura: Redis/Upstash. No implementar ahora.
- **Token rotation sin aviso a quien ya compartió la URL**: al rotar, la URL antigua devuelve 404 sin explicación. Aceptable para uso privado; no implementar página "este enlace expiró".
- **CSRF de Server Actions en endpoint anónimo**: Next valida `Origin` vs `Host`. Si en algún despliegue se accede vía un proxy con `Host` reescrito, la action rechaza todo. Documentar al desplegar.
- **Edición sin turnos futuros**: el listado público puede quedar vacío. Mostrar un mensaje "No hay turnos disponibles ahora" en lugar de 404.
- **Refine de teléfono obligatorio para voluntarios rompe alta actual**: si ya hay voluntarios en BD sin teléfono, el form de edición de empleado los rechaza al guardar sin cambios. Verificar con `SELECT id FROM "Empleado" WHERE perfil='voluntario' AND telefono IS NULL` antes de aplicar el refine, o hacerlo solo en `crearEmpleadoSchema` y no en `actualizarEmpleadoSchema`. Decisión: solo en crear; en actualizar solo exigir si se está cambiando el perfil a voluntario.
- **Extracción de helpers de solape** (Fase D): si `cargarTurnosEmpleadoEnVentana` vive inline en `turnos/actions.ts`, la extracción añade ruido al PR. Aceptable — es una mejora que paga deuda.
- **Entidad obligatoria + voluntarios existentes sin entidad**: si ya hay voluntarios en BD (`Empleado.perfil="voluntario"`) sin `entidadId`, el refine de `actualizarEmpleadoSchema` los rechazaría al editar. Mismas dos opciones que con teléfono: o backfill antes de aplicar el refine (asignar a una entidad `"Sin asignar"` por SQL), o relajar el refine en update si no se cambia el perfil. Decisión: backfill con entidad `"Sin asignar"` durante la migración (insertarla en seed y hacer `UPDATE Empleado SET entidadId=... WHERE perfil='voluntario' AND entidadId IS NULL`). Así el invariante se mantiene desde el día 1.
- **Empleado.entidadId con `onDelete: Restrict` + soft-delete**: el `Restrict` es defensa en profundidad; en la práctica nunca se ejecuta porque desde la UI solo desactivamos. Si alguien borra a mano vía `prisma studio`, la BD lo bloquea — comportamiento deseado.
- **Cambio de entidad al aprobar solicitudes recurrentes**: el plan actualiza `Empleado.entidadId` con el de la última solicitud aprobada. Esto puede sorprender si un voluntario cambia de hermandad entre años. Alternativa: no sobreescribir si ya tenía entidad. Decisión: sobreescribir (la solicitud reciente es más fiable que el dato del año anterior). Documentar en el código. **Implicación para el listado de asistencias**: la columna "entidad" refleja siempre la entidad **actual** del empleado, no la que tenía cuando asistió a un turno histórico. Si en el futuro hace falta entidad histórica, se modela una `EmpleadoEntidadHistorial` o se denormaliza en `TurnoEmpleado`. Por ahora, fuera de alcance.
- **CSV con separador `;` y BOM UTF-8**: Excel en Windows español espera `;` como separador y un BOM (`﻿`) al inicio para detectar UTF-8 correctamente. Sin BOM, Excel rompe las tildes al abrir directamente. El helper `csv.ts` debe emitir el BOM como primer byte. Tests manuales en Excel ES son la verificación canónica.
- **Default de edición = activa**: si no hay ninguna `Edicion.activa=true`, la page debe mostrar un mensaje "No hay edición activa, selecciona una en el filtro" en lugar de listar vacío sin contexto.
