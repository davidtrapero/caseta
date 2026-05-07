# Informe técnico y de arquitectura — Caseta

## Contexto

App privada (no comercial) para digitalizar la operativa de casetas de feria andaluza. Carga objetivo: 2-5 usuarios concurrentes — back-office, no POS. Tres áreas funcionales: turnos, inventario, caja. Este documento es una foto técnica del estado actual del repo (rama `main`, 2026-05-05) para servir de referencia única al detalle.

---

## 1. Stack y tooling

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.4 |
| UI runtime | React | 19.2.4 |
| Estilos | Tailwind CSS | 4 |
| Componentes | shadcn/ui (manual) + Radix + lucide-react | — |
| ORM | Prisma + `@prisma/adapter-pg` (driver JS, sin engine nativo) | 7.8 |
| BD | PostgreSQL en Neon (branches: `main` prod, `dev`, `test`) | — |
| Auth | Better Auth | 1.6.9 |
| Validación | Zod | 4.4 |
| Lenguaje | TypeScript strict, target ES2017, paths `@/* → ./src/*` | 5 |
| Tests back | Vitest | 4.1 |
| Tests e2e | Playwright (Chromium) | 1.59 |

Configs raíz en [app/](app/): [tsconfig.json](app/tsconfig.json), [eslint.config.mjs](app/eslint.config.mjs), [next.config.ts](app/next.config.ts), [vitest.config.ts](app/vitest.config.ts), [playwright.config.ts](app/playwright.config.ts).

`✶ Insight ─────────────────────────────────────`
- Prisma 7 con adapter-pg significa que en runtime **no hay binario nativo** del query engine — todo va por el driver JS `pg`. Eso simplifica deploys (compatible con edge-friendly o Lambda) pero exige mantener el adapter alineado con la versión del cliente.
- Next 16 renombró `middleware.ts` a `proxy.ts` — por eso [app/src/proxy.ts](app/src/proxy.ts) tiene ese nombre poco intuitivo.
`─────────────────────────────────────────────────`

---

## 2. Modelo de datos

Fuente de verdad: [app/prisma/schema.prisma](app/prisma/schema.prisma). 25 modelos · 9 enums · ~15 índices compuestos.

### 2.1 Núcleo temporal y organizativo
- **`Edicion`** — raíz temporal (un año de feria). Campos: `anio` (UNIQUE), `fechaInicio/Fin`, `activa`, `formularioToken` (para apuntarse voluntarios).
- **`Caseta`** — raíz organizativa persistente. `nombre` UNIQUE, `activa`.
- **`Empleado`** — entidad **distinta** a `User`. No tiene login. Campos: `dni` UNIQUE, `jornalDiario` (nullable para voluntarios), `perfil` (enum: `vigilante`, `coordinador`, `trabajador`, `voluntario`, `ayudante`), `entidadId` (opcional → `EntidadVoluntario`).

### 2.2 Turnos
- **`Turno`** — tramo horario libre `(fechaInicio, fechaFin)` ligado a `Edicion` + `Caseta`.
- **`TurnoEmpleado`** — pivot N:M con flag `asistio`. UNIQUE `(turnoId, empleadoId)`.
- **`TurnoPlaza`** — plazas planificadas por perfil (`perfil`, `cantidad`) antes de asignar empleados concretos.

### 2.3 Inventario y compras
- **`Producto`** (por caseta) → **`Stock`** desnormalizado UNIQUE `(casetaId, productoId)` — lectura rápida.
- **`MovimientoStock`** — log de `entrada`/`ajuste` con `usuarioId` y `nota`. Índice `(casetaId, productoId, fecha)`.
- **`Proveedor`** → **`Pedido`** (`estado`: pendiente/recibido/cancelado) → **`DetallePedido`**.

### 2.4 Caja y nóminas
- **`CierreDiario`** — UNIQUE `(casetaId, edicionId, fecha)`, flag `bloqueado` para auditoría.
- **`Gasto`** — `casetaId` opcional (NULL = transversal). Índice `(edicionId, fecha)`.
- **`Nomina`** — UNIQUE `(empleadoId, edicionId)`. Excluye voluntarios (sin jornal).

### 2.5 Voluntarios (módulo más reciente)
- **`EntidadVoluntario`** — soft-delete vía `activa=false`.
- **`SolicitudVoluntario`** — formulario público. Estados: pendiente/aprobada/rechazada/cancelada. Decisión auditada (`decididaAt`, `decididaPorUserId`).
- **`SolicitudVoluntarioTurno`** — pivot N:M con turnos solicitados.

### 2.6 Auth y auditoría
- **`User`** (Better Auth extendido) — `rol` (admin/gerente/cajero), `activo`. + `Session`, `Account`, `Verification`.
- **`AuditLog`** — `entidad`, `entidadId`, `accion` (create/update/delete), `usuarioId`, `cambios` (JSON), `fecha`.

### 2.7 Migraciones
Orden cronológico en [app/prisma/migrations/](app/prisma/migrations/):
1. `20260504090012_init` — esquema inicial completo
2. `20260504102815_turnos_tramos_libres` — turnos como tramos horarios
3. `20260504120000_turnos_multi_empleado` — pivot N:M
4. `20260504175350_perfiles_empleado` — enum `PerfilEmpleado`
5. `20260505120000_apuntarse_voluntarios` — `SolicitudVoluntario` + pivot

Seed: [app/prisma/seed.ts](app/prisma/seed.ts) — admin (`admin@caseta.local` / `admin1234!`), edición 2026, "Caseta escenario", 7 empleados, 2 entidades voluntarios.

---

## 3. Arquitectura de auth y autorización

### 3.1 Better Auth
- Config: [app/src/lib/auth.ts](app/src/lib/auth.ts) — adapter Prisma, sesión 7 días, cache cookie 5 min, refresh 24h. `autoSignIn` activo, registro **deshabilitado** (admin crea cuentas).
- Campos extendidos en `User`: `rol`, `activo`.
- Handler API: [app/src/app/api/auth/[...all]/route.ts](app/src/app/api/auth/[...all]/route.ts) — delega a `toNextJsHandler(auth)`.
- Cliente: [app/src/lib/auth-client.ts](app/src/lib/auth-client.ts).

### 3.2 Guards
[app/src/lib/authz.ts](app/src/lib/authz.ts):
- `requireRole(allowedRoles)` — guard de Server Action: valida sesión + rol + `activo`. Lanza `AuthError` con códigos `unauthenticated` / `forbidden` / `inactive`.
- `getSession()` — lee headers.
- `requireSessionOrRedirect()` — para RSC, redirect a `/login`.
- Tests: [app/src/lib/authz.test.ts](app/src/lib/authz.test.ts).

### 3.3 Middleware (proxy)
[app/src/proxy.ts](app/src/proxy.ts) — chequea cookie de sesión vía Better Auth en Edge runtime. **No valida rol** (Edge no tiene BD). Excluye: `/login`, `/apuntarse`, `/api/auth`, `/api/test-reset`, assets.

`✶ Insight ─────────────────────────────────────`
- La separación entre **middleware (autenticación)** y **Server Actions (autorización por rol)** es deliberada: el Edge runtime no puede tocar PostgreSQL, así que el middleware solo verifica presencia de cookie. La validación real de rol y `activo` ocurre dentro de cada acción con `requireRole()`.
- `Empleado ≠ User` — los empleados son fichas de RR.HH. (sin login). Solo admin/gerente/cajero tienen cuenta. Esto evita inflar la tabla `User` con voluntarios y simplifica nóminas.
`─────────────────────────────────────────────────`

---

## 4. Patrón canónico de Server Action

Todo write sigue esta plantilla obligatoria:

```ts
"use server";
export async function accionXAction(formData: FormData) {
  const session = await requireRole(["admin", "gerente"]);
  const parsed = schemaX.parse(Object.fromEntries(formData));
  return withAuditContext(session.user.id, async () => {
    const result = await prisma.modelo.create({ data: parsed });
    revalidatePath("/ruta");
    return { ok: true, data: result };
  });
}
```

Helpers transversales: [action-result.ts](app/src/lib/action-result.ts) (tipo de retorno), [validators.ts](app/src/lib/validators.ts), [rate-limit.ts](app/src/lib/rate-limit.ts) (in-memory por IP, suficiente para volumen feria).

---

## 5. Sistema de auditoría

[app/src/lib/audit.ts](app/src/lib/audit.ts):
- **Extensión Prisma** intercepta create/update/delete/upsert en tiempo de query.
- **`AsyncLocalStorage`** propaga `usuarioId` sin pasarlo por parámetros.
- **`withAuditContext(userId, fn)`** — wrapper en cada Server Action.
- Excluye `AuditLog`, `Session`, `Account`, `Verification` para no generar ruido.
- Persiste args completo como JSON en `AuditLog.cambios`.

`✶ Insight ─────────────────────────────────────`
- La combinación extensión Prisma + AsyncLocalStorage es **invisible al código de negocio**: el desarrollador no escribe nada de auditoría, solo envuelve la action con `withAuditContext` una vez. Esto es muy difícil de bypasear accidentalmente — cualquier write que pase por el cliente Prisma global queda registrado.
- El precio es que tests/seed que crean datos sin contexto generan filas con `usuarioId` null o no quedan auditados (depende del `if` interno de la extensión).
`─────────────────────────────────────────────────`

---

## 6. Mapa de rutas y módulos

Raíz protegida: [app/src/app/(app)/](app/src/app/(app)/) con [layout.tsx](app/src/app/(app)/layout.tsx) — sidebar con navegación filtrada por rol y `ToastProvider` global.

| Módulo | Ruta | Server actions principales |
|---|---|---|
| Admin / ediciones | `/admin/ediciones` | crear, actualizar, activar |
| Admin / casetas | `/admin/casetas` | crear, actualizar, toggleActiva (bloquea si turnos futuros) |
| Admin / empleados | `/admin/empleados` | crear, actualizar, toggleActivo — schema enforces voluntarios sin jornal |
| Admin / usuarios | `/admin/usuarios` | crear (Better Auth), actualizar, desactivar (protege min. 1 admin), reactivar |
| Admin / proveedores | `/admin/proveedores` | CRUD básico |
| Turnos | `/turnos`, `/turnos/semana`, `/turnos/imprimir` | crear, actualizar, eliminar, asignar/desasignar empleado, toggleAsistencia, duplicarDia, duplicarSemana, actualizarPlazas |
| Inventario | `/inventario/{productos,stock,pedidos,movimientos}` | CRUD productos, ajustarStock (genera MovimientoStock), pedidos con DetallePedido |
| Caja | `/caja/{gastos,cierres,balance,nominas}` | crear/actualizar/eliminar gasto, cierres con bloqueo (solo admin desbloquea) |
| Voluntarios (público) | `/apuntarse` | formulario de `SolicitudVoluntario` con `formularioToken` de la edición |
| Login | `/login` | Better Auth |

### 6.1 Lógica de dominio extraída
- [app/src/lib/turnos-solape.ts](app/src/lib/turnos-solape.ts) — detección de solapes (testeada).
- [app/src/app/(app)/turnos/_lib/huecos.ts](app/src/app/(app)/turnos/_lib/huecos.ts) — cálculo de huecos disponibles.
- [app/src/lib/edicion.ts](app/src/lib/edicion.ts) — helpers de edición activa.

### 6.2 Componentes
- **Shadcn UI**: [app/src/components/ui/](app/src/components/ui/) — button, card, input, label, badge, modal, table, toaster.
- **Locales por módulo** en `_components/`. Caso más cargado: [turnos/_components/](app/src/app/(app)/turnos/_components/) con `DialogoNuevoTurno`, `DialogoEditarTurno`, `AsignarEmpleado`, `ChipEmpleado`, `BloqueTurno`, `CalendarioDia`, `DialogoDuplicarDia`, `BotonDuplicarSemana`, `SelectorCaseta`, `NavegadorFecha`.

---

## 7. Estética y estilos

[app/src/app/globals.css](app/src/app/globals.css) — paleta cuero/latón:
- **Background**: `#ebe3d3` (beige grisáceo)
- **Primary**: `#c68a3a` (latón envejecido)
- **Destructive**: `#5c1a17` (granate profundo)
- **Tipografías**: IBM Plex Sans (UI), Bricolage Grotesque (display), JetBrains Mono (datos)
- **Texturas**: SVG fractal con `mix-blend-mode: multiply` en `body`
- **Animaciones**: `caseta-fade-in` (180ms), `caseta-stagger` (260ms) — entrada escalonada, no hovers ruidosos

Skill de proyecto: `.claude/skills/frontend-design/SKILL.md` se activa al generar UI.

---

## 8. Testing

### 8.1 Vitest (back)
- Config: [app/vitest.config.ts](app/vitest.config.ts) — env node, `fileParallelism: false` (BD compartida), timeout 30s.
- Suites activas:
  - [app/src/lib/authz.test.ts](app/src/lib/authz.test.ts), [turnos-solape.test.ts](app/src/lib/turnos-solape.test.ts)
  - Server actions: caja (cierres, nóminas), inventario (pedidos, stock), turnos (asignaciones)
- Fixtures: [app/src/test/fixtures.ts](app/src/test/fixtures.ts) con `seedMinimal()` (admin/gerente/cajero + edición + caseta + proveedor) + builders.
- Helpers: `db-reset.ts` (TRUNCATE CASCADE 30 tablas), `auth-helper.ts` (`signInAs`).

### 8.2 Playwright (e2e)
- Config: [app/playwright.config.ts](app/playwright.config.ts) — workers 1, server `next dev -p 3100` con `ENABLE_TEST_ENDPOINTS=true`.
- Estado actual (fase 6C alternativa, commit c25dadb):
  - **Activo**: `tests-e2e/smoke.spec.ts` (login admin + crear edición)
  - **En standby** (`backlog/`): auth, authz, caja, ediciones, inventario
- Endpoint reset: [app/src/app/api/test-reset/route.ts](app/src/app/api/test-reset/route.ts) — guard `NODE_ENV !== production` + flag env + header secret.

### 8.3 Estrategia por fases (commits recientes)
- 6A — branch Neon test, fixtures, endpoint reset
- 6B — vitest server actions y authz
- 6C — Playwright infra (smoke alternativa, resto en backlog)
- 6D parcial — workflow CI (vitest + lint + build)

`✶ Insight ─────────────────────────────────────`
- **No-mock policy**: tests usan branch Neon real (alineado con la preferencia documentada de evitar incidentes mock/prod). Por eso `fileParallelism: false` y workers Playwright = 1 — la BD es un recurso serializado.
- El endpoint `/api/test-reset` está protegido por **tres capas** (env, flag, secret) precisamente porque es un misil cargado: una llamada borra toda la BD.
`─────────────────────────────────────────────────`

---

## 9. Aislamiento de datos y deuda

- **dev**: branch `dev` Neon (`.env.local`).
- **test**: branch independiente para tests automatizados.
- **prod**: branch principal Neon — no tocar desde local.

Deuda declarada (en [CLAUDE.md](CLAUDE.md)):
- Rotar credenciales Neon (compartidas en chat durante bootstrap).
- Decisión monorepo vs flat pendiente si aparece segundo paquete.

---

## 10. Cómo verificar este informe

Si quieres validarlo end-to-end:
1. `cd app && npm install`
2. `npx prisma generate && npx prisma migrate dev` (contra branch dev)
3. `npx tsx prisma/seed.ts` — debe crear admin + edición + caseta + 7 empleados
4. `npm run dev` → http://localhost:3000, login `admin@caseta.local` / `admin1234!`
5. Recorrer: `/admin/ediciones`, `/admin/casetas`, `/admin/empleados`, `/turnos/semana`, `/inventario/productos`, `/caja/cierres`
6. `npm run test:back` — vitest verde
7. `npm run test:e2e` — smoke spec verde

---

## Resumen ejecutivo (TL;DR)

App Next.js 16 + React 19 + Prisma 7 + Better Auth 1.6 sobre PostgreSQL/Neon. Patrón uniforme **Server Actions con `requireRole` + Zod + `withAuditContext` + `revalidatePath`**. Modelo de 25 entidades organizadas alrededor de dos raíces (`Edicion` temporal, `Caseta` organizacional), con `Empleado` desacoplado de `User`. Auditoría automática vía extensión Prisma + AsyncLocalStorage. Estética cuero/latón, tipografías de carácter. Testing en fases (6A–6D), con branch Neon dedicado y endpoint reset triple-protegido. Deuda mínima: rotar credenciales y decisión monorepo si aparece segundo paquete.
