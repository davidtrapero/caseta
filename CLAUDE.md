# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

- [`arquitectura-feria.md`](arquitectura-feria.md) — documento de decisión de stack (histórico).
- [`plans/`](plans/) — análisis previo al desarrollo; referencia de decisiones de producto.
- [`app/`](app/) — código real de la aplicación Next.js.

Todo el trabajo de desarrollo ocurre dentro de `app/`. Los comandos de la sección de abajo se ejecutan desde esa carpeta.

## Project purpose

Private (non-commercial) web app to digitize the operation of food & drink stalls at a Spanish fair (*casetas de feria*). Three functional areas:

- **Shifts** (`turnos`): employee assignment per caseta, schedules.
- **Inventory** (`inventario`): products, stock, ins/outs.
- **Cash & bookkeeping** (`caja`): daily close per caseta, expenses, payroll.

Expected load: **2–5 concurrent users**. This is a **back-office / office app**, not a POS. Do not assume in-barra flows, offline mode or real-time shift check-in.

## Stack (instalado, no re-litigar)

Versiones reales tras bootstrap:

- **Next.js 16** (App Router) + **React 19** + **Tailwind 4**.
- **Prisma 7** con `@prisma/adapter-pg` (driver JS, sin engine nativo en runtime).
- **Better Auth 1.6** (reemplaza a la decisión original de Lucia, que fue deprecada).
- **PostgreSQL** en Neon (branch `dev`) — la BD de producción es un branch distinto en el mismo proyecto Neon.
- **shadcn/ui** instalado manualmente (componentes en [`app/src/components/ui/`](app/src/components/ui/)).
- **Zod 4** para validación.
- **TypeScript 5** strict.

## Comandos (desde `app/`)

> En entornos con proxy TLS corporativo, prepender `NODE_EXTRA_CA_CERTS='C:\Users\<user>\all_certs_full.pem'` a cualquier comando que haga fetch externo (Prisma, npm, Next telemetry).

| Comando | Qué hace |
|---|---|
| `npm run dev` | Dev server en http://localhost:3000 (Turbopack). |
| `npm run build` | Build de producción. Verifica TS + prerender. |
| `npm run lint` | ESLint. |
| `npx prisma migrate dev --name <nombre>` | Crea/aplica migración a la BD del `.env.local`. |
| `npx prisma generate` | Regenera el cliente a `node_modules/@prisma/client`. Necesario tras cambios en el schema. |
| `npx tsx prisma/seed.ts` | Ejecuta seed inicial (crea admin si no existe). |

## Decisiones arquitectónicas clave

- **Prisma schema ([`app/prisma/schema.prisma`](app/prisma/schema.prisma)) es la fuente de verdad.** Cualquier cambio de modelo empieza ahí, seguido de `migrate dev` + `generate`.
- **Server Actions sobre REST**. Sólo se crea una ruta API explícita para webhooks externos.
  - Patrón obligatorio: `"use server"` → `requireRole()` → validación Zod → operación Prisma → `revalidatePath()` → retorno tipado `{ ok: true, data } | { ok: false, error }`.
  - Helpers: [`app/src/lib/authz.ts`](app/src/lib/authz.ts) (`requireRole`, `getSession`).
- **AuditLog automático**: la extensión Prisma en [`app/src/lib/audit.ts`](app/src/lib/audit.ts) escribe una fila en `AuditLog` por cada create/update/delete de entidades de dominio. El `usuarioId` se lee de un `AsyncLocalStorage` que se setea con `withAuditContext(userId, fn)` al inicio de cada Server Action.
- **Multi-caseta desde el día 1**: casi todas las entidades operativas tienen `casetaId`. `Edicion` (el año de la feria) es raíz temporal — cuelgan de ella turnos, cierres, gastos, pedidos, movimientos de stock y nóminas.
- **Empleados no son usuarios**: `Empleado` y `User` son entidades distintas. Empleados no tienen login. Los usuarios con cuenta son `admin`, `gerente` o `cajero`.

## Roles y autorización

3 roles (enum `Rol` en schema):

- `admin` — CRUD total, gestiona usuarios, edita nóminas y cierres cerrados.
- `gerente` — operativa diaria completa. No toca nóminas ni usuarios.
- `cajero` — introduce cierres y gastos del día. Solo lectura del resto.

Autorización: llamar a `requireRole([...roles])` al inicio de cada Server Action. El middleware de Next (`src/proxy.ts`, sí, `proxy` no `middleware` — Next 16 lo renombró) redirige a `/login` si no hay cookie de sesión, pero NO hace validación de rol (Edge runtime no tiene BD).

## Aislamiento de datos

- **BD de desarrollo**: branch `dev` en Neon (URL en `app/.env.local`).
- **BD de producción**: branch principal de Neon (no usar desde desarrollo).
- Crear nuevos branches desde la consola de Neon antes de experimentar con migraciones destructivas.

## Pendientes y deuda declarada

- **Rotar credenciales de Neon** tras compartirlas en chat durante el bootstrap inicial.
- **Monorepo vs. flat**: actualmente el código vive en `app/` y la doc en la raíz. Si en el futuro aparece un segundo paquete (CLI, worker), valorar Turborepo o workspaces.

## Working style expectations

- Development es **vibe coding**: descripciones funcionales por módulo ("calendario semanal de turnos"). Preguntar dudas de dominio antes de asumir.
- Scope tight — app privada, no enterprise. No feature flags, no SSO, no roles dinámicos.
- Comentarios y UI copy en **español**. Identificadores de código en inglés salvo términos de dominio (`caseta`, `turno`, `factura`, `jornalDiario`).
- No añadir error handling para casos que no pueden pasar. Validar en bordes (Zod en Server Actions, entrada de usuario).

## Frontend aesthetics

Existe skill de proyecto en [`.claude/skills/frontend-design/SKILL.md`](.claude/skills/frontend-design/SKILL.md) — se activa automáticamente al generar UI. Complementar con las reglas siguientes, adaptadas al contexto **back-office interno** (no landing, no marketing):

<frontend_aesthetics>
Claude tiende a converger hacia outputs genéricos ("AI slop"): Inter, gradientes púrpura sobre blanco, layouts predecibles. Evítalo. Para Caseta — app privada usada a diario por 2-5 personas para gestionar una feria andaluza — busca una estética **distintiva pero funcional**:

**Tipografía**: NO usar Inter, Roboto, Arial ni system fonts. Elegir una combinación con carácter pero legible en datos densos. Sugerencias (variar entre sesiones): Fraunces/Instrument Serif para headings + IBM Plex Sans o Geist para UI + Geist Mono/JetBrains Mono para números en tablas. Las tablas de back-office viven o mueren por la legibilidad tipográfica.

**Color**: una paleta dominante con acento agudo, NO tímida equidistribuida. El dominio es "feria andaluza" → inspirarse en tierras cálidas, albero, rojo oscuro, amarillo tostado, verde oliva — NO caer en el cliché rosa/flamenco ni en el purple gradient. Definir en variables CSS en [`globals.css`](app/src/app/globals.css) y usar vía Tailwind. Un único acento fuerte (ej. rojo albero) + neutros cálidos.

**Motion**: reservada. Un page-load orquestado con `animation-delay` escalonado > micro-interacciones dispersas. PROHIBIDO: animación en hover de filas de tabla, spinners genéricos, transiciones en cambios de ruta. Permitido: fade-in al montar formularios, slide en sidebars, feedback sutil en botones de acción.

**Fondos**: textura o profundidad sutil > blanco plano. Gradiente muy suave, grano sutil, o líneas finas de fondo — nada ruidoso que compita con los datos.

**Anti-patterns (prohibidos)**:
- Inter/Roboto/Arial/system-ui
- Gradientes púrpura sobre blanco
- Cards con sombras genéricas y border-radius 8px por defecto
- Animaciones en hovers de data tables
- Iconos Lucide por defecto sin adaptarlos al tono visual

**Match al contexto**: el usuario gestiona una caseta de feria desde casa — la estética puede ser cálida y con carácter, no fría corporativa. Pero la densidad de información (tablas, forms, listados) exige precisión y legibilidad por encima de espectáculo.
</frontend_aesthetics>
