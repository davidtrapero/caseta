# Plan: Suite de QA E2E con MCP Playwright + skill de actualización de catálogo

## Context

El proyecto tiene Playwright instalado y configurado ([playwright.config.ts](app/playwright.config.ts), endpoint [/api/test-reset](app/src/app/api/test-reset/), helpers `loginUI`/`resetServerDb`, seed con 3 roles), pero solo un smoke test activo. CLAUDE.md declara como deuda explícita: *"Tests E2E: Playwright instalado, sin suites reales todavía."*

El usuario quiere un sistema de QA orquestado por dos skills:

1. **`qa-e2e`** — al invocarse, despacha subagentes QA en paralelo que leen el catálogo de casos por módulo, los ejecuta uno a uno vía **MCP Playwright** (no `npx playwright test`), genera un informe consolidado y, si hay fallos, despacha un **subagente analista** que produce un plan de actuación en Markdown sin tocar código.
2. **`qa-catalog-sync`** — skill independiente que lee los últimos commits de `main`/`master` y actualiza el catálogo cuando detecta rutas, server actions o componentes nuevos/modificados.

El catálogo es persistente (no se regenera en cada run). Reaprovecha la config E2E existente: puerto 3100, `.env.test`, reset DB vía endpoint.

---

## Arquitectura general

```
caseta/
├── app/.claude/skills/
│   ├── qa-e2e/
│   │   ├── SKILL.md                 ← orquestador principal
│   │   └── analista-fallos.md       ← prompt del subagente analista
│   └── qa-catalog-sync/
│       └── SKILL.md                 ← actualiza catálogo desde git log
├── docs/qa-cases/
│   ├── README.md                    ← índice + convenciones
│   ├── _shared/
│   │   ├── login.md                 ← procedimiento de login por rol
│   │   └── reset.md                 ← cómo resetear BD entre casos
│   ├── auth.md
│   ├── authz.md                     ← matriz rol × ruta
│   ├── turnos.md
│   ├── caja.md
│   ├── inventario.md
│   ├── voluntarios.md
│   └── admin.md
├── docs/qa-runs/                    ← informes generados (gitignored)
│   └── 2026-05-08-1430/
│       ├── informe.md
│       └── plan-fallos.md           ← solo si hubo fallos
└── plans/qa-fallos-<fecha>.md       ← copia del plan para flujo del usuario
```

---

## 1. Catálogo de casos de uso (`docs/qa-cases/`)

Markdown estructurado, una sección por caso. Cada caso tiene:

```markdown
### CASO-TURNOS-001: Crear turno sin solapamiento

**Rol**: gerente
**Precondición**: Edición activa con caseta seed; empleado seed sin turnos.
**Pasos**:
1. Navegar a `/turnos`
2. Click "Nuevo turno"
3. Rellenar: caseta=Principal, fecha=hoy, inicio=10:00, fin=14:00
4. Asignar empleado "María López"
5. Submit

**Aserciones**:
- Tras submit, el turno aparece en el calendario semanal en la celda hoy@10:00
- AuditLog se incrementó (verificable solo si se expone en UI)

**Limpieza**: reset BD via `/api/test-reset`.
```

Casos iniciales a generar (semilla desde [tests-e2e/backlog/](app/tests-e2e/backlog/) + mapa del Explore):

| Módulo | Casos mínimos |
|---|---|
| auth | login válido por rol, login inválido, logout, redirect sin cookie |
| authz | matriz rol × ruta (admin/gerente/cajero × 6 módulos) |
| turnos | crear, editar, eliminar, **detección de solapamiento** ([turnos-solape.ts](app/src/lib/turnos-solape.ts)), duplicar día/semana, asistencias |
| caja | crear cierre, bloquear (admin), intento bloqueo desde gerente, gastos CRUD, cálculo nóminas, balance |
| inventario | producto CRUD, pedido con stock atómico, recepción, ajuste manual, movimientos |
| voluntarios | formulario público con token, validación solape, aprobar/rechazar desde admin |
| admin | CRUD ediciones, activar edición, casetas, empleados con/sin email/DNI, usuarios con rol |

Total estimado: ~50–70 casos.

---

## 2. Skill `qa-e2e` ([app/.claude/skills/qa-e2e/SKILL.md](app/.claude/skills/qa-e2e/SKILL.md))

**Frontmatter**:
```yaml
---
name: qa-e2e
description: Ejecuta la suite E2E de casos de uso del proyecto vía MCP Playwright. Despacha subagentes QA en paralelo por módulo, genera informe consolidado y, si hay fallos, lanza analista para plan de actuación. Disparar con "lanzar QA", "ejecutar tests E2E", "/qa-e2e", "validar la app", "QA completo".
---
```

**Flujo procedural**:

### Fase 0 — Preparación (sin paralelismo)
1. Verificar que `app/.env.test` existe; abortar con instrucción clara si no.
2. Arrancar **una sola vez** el server de tests:
   - Comprobar si hay algo escuchando en 3100 (`curl http://localhost:3100/login` con timeout corto).
   - Si no: `cd app && next dev -p 3100` con `ENABLE_TEST_ENDPOINTS=true` y env de `.env.test`, en background. Esperar hasta 120s a que `/login` responda 200.
3. Crear directorio del run: `docs/qa-runs/<YYYY-MM-DD-HHMM>/`.
4. POST `/api/test-reset` con header `x-test-secret` para estado limpio inicial.

### Fase 1 — Ejecución paralela por módulo
Despachar **N subagentes QA en paralelo** (uno por archivo de catálogo: auth, authz, turnos, caja, inventario, voluntarios, admin), modelo `sonnet`. Cada agente recibe:
- Ruta a su `docs/qa-cases/<módulo>.md`
- Credenciales (`admin@caseta.test` / `admin1234!`, idem gerente/cajero)
- Instrucciones: usar herramientas `mcp__playwright__browser_*` para ejecutar cada caso, hacer `browser_snapshot` antes de aserciones clave, capturar `browser_take_screenshot` solo si falla.
- Entre cada caso: POST a `/api/test-reset`.
- Salida estructurada: JSON con `[{caso_id, estado: pass|fail|skip, error?, screenshot_path?, snapshot_relevante?}]` escrita en `docs/qa-runs/<run>/<módulo>.json`.

> **Importante**: aunque MCP Playwright tiene una sola sesión de navegador por proceso, los subagentes corren en procesos separados — cada uno abre su propio navegador. La serialización a nivel BD se mantiene por el reset entre casos (no entre módulos), por lo que conviene **agrupar casos del mismo módulo** y dejar que cada subagente reserve un slot de tiempo (no problema en runs nocturnos; sí en local). Aceptable en primera versión.

### Fase 2 — Consolidación
Tras todos los subagentes:
1. Leer todos los `<módulo>.json` y producir `docs/qa-runs/<run>/informe.md`:
   - Resumen ejecutivo (X/Y pasados, duración total, navegador).
   - Tabla por módulo con estado.
   - Detalle expandible por caso fallido: pasos, error, ruta a screenshot.
2. Si **hay fallos**, ir a Fase 3. Si no, terminar.

### Fase 3 — Analista de fallos (subagente único, no paralelo)
Despachar agente con prompt en [analista-fallos.md](app/.claude/skills/qa-e2e/analista-fallos.md), modelo `sonnet`. Recibe:
- Lista de fallos del informe.
- Acceso a Read/Grep sobre la app.
- Instrucción: por cada fallo, identificar archivo/función probable causa, hipótesis (regresión vs caso obsoleto vs bug nuevo), pasos sugeridos. **NO escribir código.** Solo producir `docs/qa-runs/<run>/plan-fallos.md` y copia en `plans/qa-fallos-<fecha>.md`.

### Fase 4 — Cierre
Imprimir resumen al usuario con ruta al informe y al plan (si existió).

---

## 3. Skill `qa-catalog-sync` ([app/.claude/skills/qa-catalog-sync/SKILL.md](app/.claude/skills/qa-catalog-sync/SKILL.md))

**Frontmatter**:
```yaml
---
name: qa-catalog-sync
description: Actualiza el catálogo de casos QA leyendo los últimos commits de main. Detecta nuevas rutas, server actions y componentes form/dialog y propone añadidos al catálogo. Disparar con "actualizar catálogo QA", "sincronizar casos QA", "/qa-catalog-sync", "revisar QA tras cambios".
---
```

**Flujo**:
1. `git fetch origin main` (sin merge).
2. Calcular rango: desde el commit registrado en `docs/qa-cases/.last-sync` (o `HEAD~20` si no existe) hasta `origin/main`.
3. `git diff --name-status <rango>` filtrando:
   - `app/src/app/**/page.tsx` → ruta nueva/modificada.
   - `app/src/app/**/actions.ts` → server actions.
   - `app/src/**/_components/**/Dialog*.tsx` o que contenga `<form>` → flujos UI.
4. Para cada cambio relevante: leer el commit, deducir módulo, abrir el `.md` correspondiente y proponer un nuevo caso (sección comentada con `<!-- TODO: validar caso propuesto -->` para revisión humana).
5. Actualizar `docs/qa-cases/.last-sync` con el SHA procesado.
6. Imprimir resumen: cambios detectados, casos sugeridos, ficheros tocados.

> Esta skill **no** ejecuta tests. Solo mantiene el catálogo.

---

## 4. Archivos críticos a crear/modificar

| Acción | Archivo |
|---|---|
| Crear | [app/.claude/skills/qa-e2e/SKILL.md](app/.claude/skills/qa-e2e/SKILL.md) |
| Crear | [app/.claude/skills/qa-e2e/analista-fallos.md](app/.claude/skills/qa-e2e/analista-fallos.md) |
| Crear | [app/.claude/skills/qa-catalog-sync/SKILL.md](app/.claude/skills/qa-catalog-sync/SKILL.md) |
| Crear | [docs/qa-cases/README.md](docs/qa-cases/README.md) + 7 ficheros de módulo + `_shared/` |
| Crear | [docs/qa-runs/.gitignore](docs/qa-runs/.gitignore) (`*` excepto `.gitignore`) |
| Modificar | [.gitignore](.gitignore) raíz para excluir `docs/qa-runs/` |
| Reusar | [tests-e2e/_helpers.ts](app/tests-e2e/_helpers.ts) — referencia conceptual del flujo `loginUI`/`resetServerDb` (la skill replica los pasos vía MCP, no lo importa). |
| Reusar | [tests-e2e/backlog/](app/tests-e2e/backlog/) — semilla del catálogo. |

---

## 5. Decisiones explícitas

- **No se borran los specs de `tests-e2e/`**. Coexisten: la suite Playwright nativa para CI futuro, la skill MCP para QA dirigida por agente.
- **Sin paralelismo dentro de un módulo**: cada subagente ejecuta sus casos en serie por la dependencia del reset DB.
- **Credenciales hardcodeadas en el catálogo** son las del seed de test (`admin@caseta.test` / `admin1234!`), no producción. Documentar esto en `_shared/login.md`.
- **Servidor de tests**: la skill prefiere reusar uno existente en 3100; si no, lo arranca y lo deja vivo (no lo mata al terminar — el usuario decide). Esto contradice el `reuseExistingServer: false` del config nativo, pero ese setting es para `npx playwright test`; aquí no aplica.
- **Modelo de subagentes QA**: `sonnet` (multi-paso pero acotado por caso). Analista: `sonnet` también.

---

## 6. Verificación end-to-end

1. **Catálogo**: tras crear los 7 ficheros, abrir `docs/qa-cases/turnos.md` y comprobar que un caso es ejecutable mentalmente sin contexto adicional.
2. **Skill `qa-e2e` dry run**:
   - Invocar la skill con la app en estado limpio.
   - Verificar que arranca el server en 3100 si no estaba.
   - Verificar que se crea `docs/qa-runs/<fecha>/` con un `.json` por módulo y un `informe.md` consolidado.
3. **Forzar fallo controlado**: añadir un caso al catálogo que apunte a una ruta inexistente (`/turnos/inexistente`). Re-ejecutar y comprobar que:
   - El subagente reporta el fallo con screenshot.
   - El analista produce `plan-fallos.md` con hipótesis razonable.
   - No se ha modificado código de la app.
4. **Skill `qa-catalog-sync`**:
   - Hacer un commit dummy que añada un fichero `app/src/app/(app)/turnos/nueva-vista/page.tsx`.
   - Invocar la skill.
   - Verificar que `docs/qa-cases/turnos.md` recibe un caso propuesto comentado.
5. **Limpieza**: borrar `docs/qa-runs/<run>` tras la verificación.
