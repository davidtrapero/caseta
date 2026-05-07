# CLAUDE.md

## Repository layout

- [`arquitectura-feria.md`](arquitectura-feria.md) — decisión de stack (histórico).
- [`plans/`](plans/) — análisis previo al desarrollo.
- [`app/`](app/) — código real Next.js. Todo el desarrollo ocurre aquí.

## Project purpose

App privada para digitalizar la operación de casetas de feria (comida y bebida). Tres áreas:

- **Turnos**: asignación de empleados por caseta, calendarios, asistencias.
- **Inventario**: productos, stock, pedidos, movimientos.
- **Caja**: cierres diarios, gastos, nóminas, balance.

Carga esperada: **2–5 usuarios concurrentes**. Back-office, no POS. Sin offline ni check-in en tiempo real.

## Stack

- **Next.js 16** (App Router) + **React 19** + **Tailwind 4**.
- **Prisma 7** con `@prisma/adapter-pg` (driver JS, sin engine nativo en runtime).
- **Better Auth 1.6** — autenticación (reemplazó a Lucia, que fue deprecada).
- **PostgreSQL** en Neon (branch `dev` para desarrollo, branch principal para prod).
- **shadcn/ui** en [`app/src/components/ui/`](app/src/components/ui/).
- **Zod 4** + **TypeScript 5** strict.

## Comandos (desde `app/`)

> Proxy TLS corporativo: prepender `NODE_EXTRA_CA_CERTS='C:\Users\<user>\all_certs_full.pem'` a comandos con fetch externo.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Dev server http://localhost:3000 (Turbopack). |
| `npm run build` | Build producción. Verifica TS + prerender. |
| `npm run lint` | ESLint. |
| `npx prisma migrate dev --name <nombre>` | Crea/aplica migración al branch dev. |
| `npx prisma generate` | Regenera cliente tras cambios en schema. |
| `npx tsx prisma/seed.ts` | Seed inicial (crea admin si no existe). |

## Decisiones arquitectónicas

- **Schema Prisma** ([`app/prisma/schema.prisma`](app/prisma/schema.prisma)) es fuente de verdad. Cambios: schema → `migrate dev` → `generate`.
- **Server Actions sobre REST.** Patrón obligatorio: `"use server"` → `requireRole()` → Zod → Prisma → `revalidatePath()` → `{ ok: true, data } | { ok: false, error }`. Helpers en [`app/src/lib/authz.ts`](app/src/lib/authz.ts).
- **AuditLog automático** ([`app/src/lib/audit.ts`](app/src/lib/audit.ts)): escribe en `AuditLog` por cada mutación. `usuarioId` vía `AsyncLocalStorage` + `withAuditContext(userId, fn)`.
- **Multi-caseta desde el día 1**: entidades operativas tienen `casetaId`. `Edicion` (año de feria) es raíz temporal — turnos, cierres, gastos, pedidos, movimientos y nóminas cuelgan de ella.
- **Empleados ≠ Usuarios**: `Empleado` no tiene login. Usuarios tienen rol `admin`, `gerente` o `cajero`.
- **Middleware**: `src/proxy.ts` (Next 16 renombró `middleware`) — redirige a `/login` sin cookie. Sin validación de rol (Edge runtime no tiene BD).

## Roles

- `admin` — CRUD total, gestión de usuarios, nóminas y cierres bloqueados.
- `gerente` — operativa diaria completa. Sin nóminas ni usuarios.
- `cajero` — introduce cierres y gastos. Solo lectura del resto.

## Estado de implementación (mayo 2026)

Aplicación en producción (Vercel + Neon). Todos los módulos operativos:

| Módulo | Rutas principales | Estado |
|---|---|---|
| Dashboard | `/` | KPIs, turnos de hoy, alertas, actividad reciente |
| Turnos | `/turnos/semana`, `/turnos/asistencias`, `/turnos/imprimir` | Calendario, duplicación día/semana, solapamientos, exportación CSV |
| Voluntarios | `/apuntarse/[token]`, `/admin/solicitudes` | Formulario público con token + aprobación/rechazo con validación de solapamientos |
| Caja | `/caja/cierres`, `/caja/gastos`, `/caja/nominas`, `/caja/balance` | Cierres bloqueables, nóminas calculadas, balance de edición |
| Inventario | `/inventario/productos`, `/inventario/pedidos`, `/inventario/movimientos`, `/inventario/stock` | CRUD completo, pedidos con stock atómico |
| Admin | `/admin/ediciones`, `/admin/casetas`, `/admin/empleados`, `/admin/usuarios`, `/admin/proveedores`, `/admin/entidades` | CRUD completo |

## Deuda declarada

- **Rotar credenciales Neon** (compartidas en chat durante bootstrap inicial).
- Tests E2E: Playwright instalado, sin suites reales todavía.

## Working style

- **Vibe coding**: descripciones funcionales por módulo. Preguntar dudas de dominio antes de asumir.
- Scope tight — sin feature flags, sin SSO, sin roles dinámicos.
- Comentarios y UI copy en **español**. Identificadores en inglés salvo términos de dominio (`caseta`, `turno`, `jornalDiario`…).
- Sin error handling para casos imposibles. Validar solo en bordes (Zod en Server Actions, entrada de usuario).

## Skills de proyecto

- **deploy-produccion** — [`app/.claude/skills/deploy-produccion/SKILL.md`](app/.claude/skills/deploy-produccion/SKILL.md)
  Disparar con: "subir a producción", "deploy", "hacer el deploy", "subida a prod", "publicar", "lanzar a prod".
  Valida (lint + build), sube versión semver, hace commit `chore(release): vX.Y.Z` y push. Pide confirmación antes del commit.

## Frontend aesthetics

Skill activa en [`.claude/skills/frontend-design/SKILL.md`](.claude/skills/frontend-design/SKILL.md). Reglas para back-office de feria andaluza:

- **Tipografía**: NO Inter/Roboto/Arial/system-ui. Combinar serif con carácter (Fraunces, Instrument Serif) para headings + IBM Plex Sans o Geist para UI + Geist Mono/JetBrains Mono para números en tablas.
- **Color**: paleta dominante con acento agudo. Inspiración: albero, rojo oscuro, amarillo tostado, verde oliva — no cliché flamenco ni purple gradient. Variables CSS en [`globals.css`](app/src/app/globals.css); un acento fuerte + neutros cálidos.
- **Motion**: reservada. Fade-in al montar formularios, slide en sidebars. PROHIBIDO: hover en filas de tabla, spinners genéricos, transiciones de ruta.
- **Fondos**: textura o profundidad sutil > blanco plano.
- **Anti-patterns prohibidos**: gradientes púrpura, cards con sombras genéricas y `border-radius 8px` por defecto, iconos Lucide sin adaptar al tono visual.
