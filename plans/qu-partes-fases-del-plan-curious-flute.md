# Plan: Fase 6 — Testing automatizado

## Contexto

Tras cerrar la Fase 5 (Inventario), el plan maestro tiene todas las fases
funcionales completadas (0, 1, 2, 3, 3.5, 4A–4D, 5A–5D). La única fase
pendiente según [plans/lanza-un-agente-arquitecto-optimized-finch.md](lanza-un-agente-arquitecto-optimized-finch.md)
y [plans/estoy-de-acuerdo-con-purring-toast.md](estoy-de-acuerdo-con-purring-toast.md#L113-L126)
es la red de pruebas automatizadas.

**Por qué ahora**: la feria usa la app con dinero real en nóminas y balance.
Queremos blindar los cálculos críticos (nóminas, recepción de pedidos,
cierres bloqueados) antes de que aparezca el primer bug de regresión durante
una noche de feria.

**Outcome esperado**: `npm test` corre en local y en CI y falla ante:
- Rotura de autorización (un cajero accede a admin).
- Cálculos de nómina incorrectos (voluntarios incluidos, pagadas sobrescritas).
- Recepción de pedido no-idempotente o stock descuadrado.
- Solape de turnos no detectado.
- Cualquier flujo crítico cliente→server roto (login, crear edición, ver
  balance).

Decisiones ya tomadas con el usuario (no re-litigar):
- **BD de test**: branch Neon dedicado `test`. Sin Docker local.
- **Alcance**: los 3 niveles — Vitest back + Playwright front + E2E.
- **Deuda cruzada** (rotar credenciales Neon, monorepo): fuera de alcance.

---

## Estado actual relevante

- [app/package.json](../app/package.json) no tiene Vitest, Playwright ni script `test`.
  `dotenv`, `tsx` y `@prisma/client` ya presentes.
- Único test existente: [app/src/lib/turnos-solape.test.ts](../app/src/lib/turnos-solape.test.ts)
  usa `node:test`. Migrable a Vitest con cambio de imports (asserts compatibles).
- [app/prisma/seed.ts](../app/prisma/seed.ts) crea admin inicial — sirve de
  base para extraer `seedMinimal()`.
- Helpers ya consolidados a reutilizar:
  - [requireRole](../app/src/lib/authz.ts) + clase `AuthError` con códigos.
  - [withAuditContext](../app/src/lib/audit.ts) (lee `AsyncLocalStorage`).
  - [parseForm + toActionError](../app/src/lib/action-result.ts).
  - [obtenerEdicionActiva](../app/src/lib/edicion.ts).
  - [detectarSolape](../app/src/lib/turnos-solape.ts) (pura, sin Prisma).

---

## Arquitectura de testing

### Infraestructura común

```
app/
  .env.test                      # DATABASE_URL del branch Neon test (gitignore)
  vitest.config.ts
  playwright.config.ts
  src/test/
    load-env.ts                  # lee .env.test; usado en setupFiles y globalSetup
    db-reset.ts                  # TRUNCATE + migrate; resetDb()
    fixtures.ts                  # seedMinimal() + builders crearEdicion/Empleado/Turno/…
    auth-helper.ts               # signInAs(rol) para Vitest + loginUI(page,rol) para Playwright
    vitest-setup.ts              # mock de next/headers y next/cache
    e2e-setup.ts                 # globalSetup Playwright: resetDb + seedMinimal
  src/app/api/_test/reset/route.ts   # endpoint para que Playwright resetee BD entre specs
                                      # sólo responde si NODE_ENV==='test'
  tests-e2e/                     # Playwright specs
```

**Branch Neon `test`**: crear desde consola Neon copiando `main`. Guardar la
connection string en `app/.env.test` como `DATABASE_URL=...` más
`BETTER_AUTH_SECRET=test-secret` y `BETTER_AUTH_URL=http://localhost:3100`.
Añadir `.env.test` al `.gitignore` junto con `.env.local`.

**Aislamiento de paralelismo**: Vitest con `poolOptions.threads.singleThread: true`
inicialmente. Una única BD compartida no aguanta TRUNCATE en paralelo; antes
que inventar branch-per-worker lo dejamos serial (los tests son rápidos).

### Bypass de Better Auth en tests

`signInAs(rol)`: inserta `user` + `session` directamente vía Prisma y devuelve
`cookieHeader`. Vitest mockea `next/headers` para devolver esta cookie cuando
la server action llama a `getSession()`.

`loginUI(page, rol)`: en Playwright hace login real vía la UI (más lento pero
no depende de la API interna de Better Auth). Usuarios sembrados en
`seedMinimal()` con passwords fijas conocidas por los tests.

### Mocks de Next

En `vitest-setup.ts`:
- `vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))`
- `vi.mock('next/navigation', () => ({ redirect: vi.fn((url) => { throw new Error(`REDIRECT:${url}`) }) }))` — redirect en server actions se detecta por el error lanzado.
- `vi.mock('next/headers', () => ({ headers: () => new Headers({ cookie: __testCookie }) }))` — la cookie la setea `signInAs()`.

---

## Sub-fases y commits

### 6A — Infraestructura de test (bloqueante para 6B/C/D)

Archivos nuevos:
- `app/.env.test` (manual, local).
- `app/src/test/load-env.ts`, `db-reset.ts`, `fixtures.ts`, `auth-helper.ts`,
  `vitest-setup.ts`, `e2e-setup.ts`.
- `app/src/app/api/_test/reset/route.ts` (guard `NODE_ENV==='test'`).

Modificaciones:
- Extraer de [app/prisma/seed.ts](../app/prisma/seed.ts) funciones reutilizables
  (`crearUsuario`, `seedMinimal`) dejando intacta la CLI del seed.
- Añadir `.env.test` al `.gitignore`.

Commit: `test(infra): neon test branch, db reset y fixtures`.

### 6B — Vitest: Server Actions y helpers

Archivos nuevos:
- `app/vitest.config.ts` — `environment: 'node'`, `setupFiles: ['./src/test/load-env.ts','./src/test/vitest-setup.ts']`, `poolOptions.threads.singleThread: true`.
- Test suites nuevas:
  - [app/src/lib/authz.test.ts](../app/src/lib/authz.ts) — `requireRole` 4 casos (unauth, inactive, forbidden, ok).
  - [app/src/app/(app)/turnos/actions.test.ts](../app/src/app/(app)/turnos/actions.ts) — `crearTurnoAction` (autz por rol, Zod, UNIQUE turno+empleado), asignar/desasignar.
  - [app/src/app/(app)/caja/nominas/actions.test.ts](../app/src/app/(app)/caja/nominas/actions.ts) — `calcularNominasAction` (voluntarios excluidos, pagadas preservadas, upsert, bloqueo gerente si hay pagadas).
  - [app/src/app/(app)/caja/cierres/actions.test.ts](../app/src/app/(app)/caja/cierres/actions.ts) — cierre bloqueado rechaza a gerente, admin sí puede.
  - [app/src/app/(app)/inventario/stock/actions.test.ts](../app/src/app/(app)/inventario/stock/actions.ts) — diferencia 0 no inserta movimiento; signo correcto para positivo/negativo.
  - [app/src/app/(app)/inventario/pedidos/actions.test.ts](../app/src/app/(app)/inventario/pedidos/actions.ts) — `recibirPedidoAction` idempotente, un `MovimientoStock` por línea, `Stock` acumula.

Migración:
- [app/src/lib/turnos-solape.test.ts](../app/src/lib/turnos-solape.test.ts) de
  `node:test` + `node:assert/strict` → `vitest` (cambiar imports; `test(...)` es idéntico).

Scripts añadidos a `package.json`:
```
"test:back": "vitest run",
"test:back:watch": "vitest"
```

Dependencias nuevas (devDeps): `vitest`, `@vitest/ui`.

Commit: `test(back): vitest suites para server actions y authz`.

### 6C — Playwright: flujos UI

Archivos nuevos:
- `app/playwright.config.ts` — `baseURL: 'http://localhost:3100'`,
  `webServer: { command: 'next dev -p 3100', env: { NODE_ENV: 'test' } }`,
  `globalSetup: './src/test/e2e-setup.ts'`, `timeout: 120_000` (Windows cold start).
- 5 specs en `app/tests-e2e/`:
  - `auth.spec.ts` — login OK + login con password malo.
  - `ediciones.spec.ts` — admin crea edición desde `/admin/ediciones/nueva` y pulsa "Activar"; badge "Activa" visible.
  - `caja.spec.ts` — registrar cierre en `/caja/cierres/nuevo`; fila aparece en `/caja/balance`.
  - `inventario.spec.ts` — crear producto, ajustar stock +10, fila `ajuste` visible en `/inventario/movimientos`.
  - `authz.spec.ts` — cajero no accede a `/admin/ediciones`.

Scripts:
```
"test:front": "playwright test --grep-invert @e2e"
```

Dependencias: `@playwright/test`. Post-install: `npx playwright install chromium`.

Commit: `test(front): playwright flujos auth, ediciones, caja, inventario`.

### 6D — E2E flujo completo + CI

Archivo nuevo:
- `app/tests-e2e/flujo-completo.spec.ts` (tag `@e2e`):
  login admin → `/admin/ediciones/nueva` (crear + activar)
  → `/admin/casetas/nueva`
  → `/admin/empleados/nuevo` ×2 (el segundo con `perfil=voluntario`, jornal vacío)
  → `/turnos` crear turno asignando ambos
  → marcar asistencia de los dos
  → `/caja/cierres/nuevo` ingreso 100€
  → `/caja/nominas` "Calcular" — assert: 1 nómina creada (voluntario excluido)
  → `/caja/balance` — assert: `resultado = 100 − 0 − total_nomina`.
- `.github/workflows/test.yml` (opcional pero recomendado): job Ubuntu con
  `npm ci` → `prisma migrate deploy` → `test:back` → `playwright install --with-deps chromium` → `test:front` → `test:e2e`. Secrets: `DATABASE_URL_TEST`, `BETTER_AUTH_SECRET`.

Scripts finales:
```
"test": "npm run test:back && npm run test:front && npm run test:e2e",
"test:e2e": "playwright test --grep @e2e",
"test:reset-db": "tsx src/test/db-reset.ts && tsx prisma/seed.ts"
```

Commit: `test(e2e): flujo completo edicion→balance + CI`.

---

## Ficheros críticos a crear/modificar

Crear:
- [app/.env.test](../app/.env.test)
- [app/vitest.config.ts](../app/vitest.config.ts)
- [app/playwright.config.ts](../app/playwright.config.ts)
- [app/src/test/](../app/src/test/) completo (6 ficheros).
- [app/src/app/api/_test/reset/route.ts](../app/src/app/api/_test/reset/route.ts)
- [app/tests-e2e/](../app/tests-e2e/) (5 specs front + 1 e2e).
- `.github/workflows/test.yml` (root del repo, opcional).
- Test suites por acción listadas en 6B.

Modificar:
- [app/package.json](../app/package.json) — scripts + devDeps.
- [app/prisma/seed.ts](../app/prisma/seed.ts) — extraer funciones reutilizables sin romper CLI.
- [app/src/lib/turnos-solape.test.ts](../app/src/lib/turnos-solape.test.ts) — migrar a Vitest.
- `.gitignore` — añadir `.env.test`.

---

## Reutilización explícita

- **No reinventar autorización**: los tests importan [requireRole](../app/src/lib/authz.ts) y la clase `AuthError` para asertar códigos.
- **No reinventar audit**: las aserciones sobre `AuditLog` se hacen leyendo la tabla real tras cada operación, no mockeando [withAuditContext](../app/src/lib/audit.ts).
- **Fixtures usan builders**, no `prisma.*.create` suelto: todos los tests piden entidades vía `crearEdicion()`, `crearEmpleado()`, etc. de `fixtures.ts`. Eso garantiza invariantes (p.ej. voluntario ⇔ `jornalDiario=null`).
- **`detectarSolape`** ya es pura y testeable — la suite existente se mantiene y se completa en 6B si faltan casos borde.

---

## Verificación end-to-end

1. `cd app && npm install` con las nuevas devDeps instala Vitest + Playwright sin errores TLS.
2. Configurar `.env.test` con el branch Neon. `npm run test:reset-db` deja la BD limpia con seed mínimo.
3. `npm run test:back` verde (≥15 suites, ~30 tests).
4. `npm run test:front` verde en Chromium (5 specs).
5. `npm run test:e2e` verde (1 spec). Inspeccionar `AuditLog` manualmente tras correrlo: debe tener entradas de `create` para cada entidad tocada.
6. `npm test` encadena los 3 y el exit code global es 0.
7. `npm run build` sigue pasando limpio (los tests no deben romper el build de producción).
8. Opcional: abrir un PR tonto; el workflow CI lo bloquea si algún nivel falla.

---

## Riesgos y decisiones ambiguas

- **Mock de `next/navigation.redirect`**: las server actions usan `redirect()` tras el `try/catch`; al mockearlo hay que simular que lanza, porque el código real también lo hace. Si no se simula, el test continúa y el assert posterior puede pasar por las razones equivocadas.
- **Race conditions en la BD única**: Vitest serializado resuelve el problema pero ralentiza. Si la suite crece por encima de ~1 min, replantear branch-per-worker (costoso en Neon).
- **Better Auth programático**: `auth.api.signUpEmail` puede cambiar entre versiones menores. El helper `signInAs()` depende de la forma interna de la tabla `Session` — si cambia el schema de Better Auth tras un upgrade, hay que revisarlo.
- **Playwright en Windows corporativo**: `npx playwright install chromium` puede chocar con el proxy TLS. Preparar `NODE_EXTRA_CA_CERTS` también para ese comando; si falla, descargar el browser manualmente y apuntar `PLAYWRIGHT_BROWSERS_PATH`.
- **CI opcional**: si se omite, el contrato "corren en local antes de merge" depende de disciplina humana. Recomendado activarlo desde 6D.
