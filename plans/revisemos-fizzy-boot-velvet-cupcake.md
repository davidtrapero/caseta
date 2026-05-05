# Auditoría técnica: plan fizzy-boot (módulo voluntarios)

## Contexto

El plan [plans/quiero-a-adir-un-m-dulo-fizzy-boot.md](quiero-a-adir-un-m-dulo-fizzy-boot.md)
describe el módulo público de apuntarse voluntarios + catálogo de entidades.
Tiene 368 líneas, varias afirmaciones sobre el estado actual del código y
4 sub-fases (A, B0, B, C, D). Antes de empezar Fase A queremos validar
contra el repo real cada premisa para no arrastrar trabajo inútil ni
deudas tácitas.

**Por qué ahora**: en working tree quedó modificado el plan fizzy-boot
añadiendo `EntidadVoluntario` (commit pendiente). Antes de aceptar esa
modificación o cualquier otra, hace falta saber qué partes del plan son
fieles al código y cuáles son optimistas u obsoletas.

**Outcome esperado**: una lista de hallazgos accionables — qué cambios
del plan se pueden ejecutar tal cual, cuáles requieren ajuste antes de
implementarse, y qué riesgos NO listados deben absorberse en el propio
plan antes de marcar Fase A como ejecutable.

---

## Hallazgos consolidados (3 ejes auditados)

Auditados por 3 Explore agents en paralelo: schema/migraciones,
actions/helpers, seguridad/UI. Reporto sólo los hallazgos accionables,
no la verificación entera.

### Eje 1 — Schema y migraciones

| # | Línea plan | Veredicto | Hallazgo |
|---|---|---|---|
| 1.1 | L25 | OK | `Empleado.dni` ya es `String? @unique`, `telefono` opcional sin constraint, enum `PerfilEmpleado` incluye `voluntario`, `TurnoPlaza` modela huecos. Confirmado en [app/prisma/schema.prisma](../app/prisma/schema.prisma). |
| 1.2 | L160-168 | OK | El SQL del índice parcial es correcto. El enum `PerfilEmpleado` está como tipo nativo Postgres (ver [migrations/20260504175350_perfiles_empleado/migration.sql](../app/prisma/migrations/20260504175350_perfiles_empleado/migration.sql)), por lo que `WHERE perfil = 'voluntario'` no necesita casting. |
| 1.3 | L134 | OK | `User.id` es `String @id @default(cuid())`, compatible con FK `decididaPorUserId String?`. |
| 1.4 | L201, 366 | **AMBIGUO** | El seed actual en [app/prisma/seed.ts](../app/prisma/seed.ts) (líneas 75-76) ya crea 2 voluntarios sin `entidadId` ni `telefono`. El plan habla de "backfill durante la migración" pero NO especifica el orden: la entidad "Sin asignar" debe existir antes del `UPDATE`. **Acción**: en la migración SQL del índice parcial, añadir también `INSERT INTO "EntidadVoluntario" ("id","nombre","activa") VALUES (...) ON CONFLICT DO NOTHING;` y a continuación el `UPDATE Empleado SET entidadId=...`. NO delegarlo al seed (que sólo corre manualmente). |
| 1.5 | L364 | **FALSO** | El plan asume que `crearEmpleadoSchema` y `actualizarEmpleadoSchema` son distintos. **Realidad** en [empleados/schema.ts:40-41](../app/src/app/(app)/admin/empleados/schema.ts): son idénticos (`actualizarEmpleadoSchema = baseEmpleado`). Para implementar el refine "obligatorio sólo en crear" hay que separarlos primero. Coste: 5 líneas; pero el plan no lo lista. |

### Eje 2 — Server Actions y helpers

| # | Línea plan | Veredicto | Hallazgo |
|---|---|---|---|
| 2.1 | L26-34, 327-333 | OK | `detectarSolape` puro, `requireRole`/`getSession`/`AuthError`, `parseForm`/`toActionError`/`ActionResult<T>`: todos existen con la firma que el plan supone. |
| 2.2 | L177 | **FALSO/INNECESARIO** | El plan dice "Modificar `audit.ts` si `withAuditContext` no admite string arbitrario". **Realidad** en [audit.ts:21-26](../app/src/lib/audit.ts): la firma ya es `usuarioId: string \| null`. **Acción**: borrar este punto del plan — no hace falta modificar audit.ts para usar `"public:apuntarse"`. |
| 2.3 | L240, 332 | OK | `detectarSolape` recibe `empleadoId: string` genérico — admite el "empleadoId sintético = teléfono". Patrón canónico `asignarEmpleadoAction` confirmado en [turnos/actions.ts:285-342](../app/src/app/(app)/turnos/actions.ts). |
| 2.4 | L320, 365 | OK | `cargarTurnosEmpleadoEnVentana` ya está como helper inline en [turnos/actions.ts:28-48](../app/src/app/(app)/turnos/actions.ts), reutilizado por varias actions. La extracción a `_lib/solape-helpers.ts` propuesta en Fase D sigue siendo razonable. |
| 2.5 | L246-247 | OK | `useActionState` ya está en uso (`empleado-form.tsx`, `caseta-form.tsx`, `toggle-activa.tsx`). El plan NO introduce un patrón nuevo. |

### Eje 3 — Seguridad, UI, rate limit

| # | Línea plan | Veredicto | Hallazgo |
|---|---|---|---|
| 3.1 | L41-65 | OK | El layout raíz [app/src/app/layout.tsx](../app/src/app/layout.tsx) sólo carga fuentes y metadata, no hace I/O de sesión. Una ruta pública `/apuntarse/[token]` fuera de `(app)` hereda sólo estilos. |
| 3.2 | L26, 174 | **AMBIGUO** | El matcher actual en [proxy.ts:17-19](../app/src/proxy.ts) es `((?!login\|api/auth\|api/test-reset\|_next/static\|_next/image\|favicon.ico).*)`. El plan propone `((?!login\|apuntarse\|api/auth\|_next/static\|_next/image\|favicon.ico).*)` — **omite `api/test-reset` que ya está en producción**. Acción: el matcher final debe contener AMBOS, `apuntarse` y `api/test-reset`. |
| 3.3 | L33, 34 | OK | `button`, `input`, `label`, `card`, `badge`, `toaster` confirmados en [components/ui/](../app/src/components/ui/). `FieldError`/`FormError` exportados en [admin/_components/page-header.tsx:80-96](../app/src/app/(app)/admin/_components/page-header.tsx) y son agnósticos a auth. |
| 3.4 | L78, 362 | OK | [next.config.ts](../app/next.config.ts) está vacío — Next 16 valida `Origin` vs `Host` por defecto, sin overrides. |
| 3.5 | L76 | OK | `headers()` se usa con `await` en [authz.ts:17](../app/src/lib/authz.ts) y [(app)/layout.tsx:28](../app/src/app/(app)/layout.tsx). El plan debe usar `await headers()` también. |
| 3.6 | L260, 283, 321 | **HALLAZGO NUEVO (no listado en plan)** | [(app)/layout.tsx:15-21](../app/src/app/(app)/layout.tsx) define `NAV` como array hardcoded sin filtro por rol. El plan asume "ítem Solicitudes/Entidades visible a admin/gerente" pero hoy NAV no soporta visibility condicional. Hay que añadirlo (lectura de `user.rol` desde el layout, ya disponible vía `requireSessionOrRedirect()`, y filtrar `NAV` por roles permitidos por entrada). Coste: ~15 líneas. |
| 3.7 | L73-80 | **AMBIGUO** | El plan propone `crypto.randomBytes(18).toString("base64url")`. Hoy NO se usa `crypto` en `/src`. Para asegurar runtime Node (Server Actions pueden ir a Edge), importar desde `node:crypto` (no `crypto` desnudo) y, si fuese necesario, declarar `export const runtime = "nodejs"` en la action. Documentar en el plan. |
| 3.8 | L268 | OK | `TurnoEmpleado.asistio` tiene `@default(false)`, no hay otros campos obligatorios sin default — crear con campos mínimos funciona. |
| 3.9 | L260 | OK (con matiz) | Tanto [(app)/layout.tsx](../app/src/app/(app)/layout.tsx) como [admin/layout.tsx](../app/src/app/(app)/admin/layout.tsx) llaman `requireSessionOrRedirect()`, NO `requireRole`. El `requireRole` dentro de cada page sigue siendo necesario (defensa en profundidad). El plan acierta. |

---

## Acciones consolidadas sobre el plan

Antes de marcar Fase A ejecutable, aplicar estos ajustes al plan
[plans/quiero-a-adir-un-m-dulo-fizzy-boot.md](quiero-a-adir-un-m-dulo-fizzy-boot.md):

1. **Borrar la modificación a `audit.ts`** (línea 177): innecesaria.
2. **Reescribir el matcher del proxy** (línea 175): mantener `api/test-reset` además de añadir `apuntarse`.
3. **Añadir paso de backfill al SQL de la migración** (sección Fase A):
   `INSERT INTO "EntidadVoluntario"` de `"Sin asignar"` con id fijo conocido,
   seguido de `UPDATE "Empleado" SET "entidadId" = ... WHERE perfil='voluntario' AND "entidadId" IS NULL`.
   Esto cierra la ambigüedad orden seed/migración.
4. **Añadir paso "separar `crearEmpleadoSchema` y `actualizarEmpleadoSchema`"** al inicio de Fase A: hoy son idénticos; el refine "teléfono/entidad obligatorios sólo en crear" requiere la separación previa.
5. **Documentar `node:crypto` y runtime Node** en la sección Seguridad del token (línea 73-80).
6. **Nueva tarea en Fase B0 o Fase A**: refactorizar `NAV` en `(app)/layout.tsx` para aceptar visibility por rol (`{ href, label, roles?: Rol[] }`). Sin esto, los ítems "Solicitudes" y "Entidades" no se pueden filtrar por rol como el plan promete.

## Decisión sobre el diff pendiente en working tree

El diff actual de [plans/quiero-a-adir-un-m-dulo-fizzy-boot.md](quiero-a-adir-un-m-dulo-fizzy-boot.md)
añade el catálogo `EntidadVoluntario`. Esa adición es **conceptualmente
correcta** (hallazgo 1.4 lo respalda: hay voluntarios sin entidad y el
plan necesita absorber el backfill), PERO necesita los 6 ajustes de
arriba antes de quedar ejecutable.

**Opciones**:
- (a) commitear el diff fizzy-boot tal cual + un segundo commit que aplique los 6 ajustes de auditoría.
- (b) commitear ya con los 6 ajustes incorporados (un único commit "plan: refinar fizzy-boot tras auditoría").
- (c) descartar el diff actual y reescribir el plan de cero con los hallazgos.

Recomendación: **(b)**. El diff actual es coherente con la auditoría
(meter `EntidadVoluntario` resuelve un hueco real); aplicar encima los
6 ajustes en el mismo commit deja el plan listo para ser ejecutado por
fases A→D sin re-litigar.

---

## Verificación

1. Releer [plans/quiero-a-adir-un-m-dulo-fizzy-boot.md](quiero-a-adir-un-m-dulo-fizzy-boot.md)
   tras los 6 ajustes y confirmar que cada hallazgo de la tabla queda
   absorbido. Marcar el plan como "auditado 2026-05-05" en su sección
   de estado.
2. Antes de arrancar Fase A, abrir [app/prisma/schema.prisma](../app/prisma/schema.prisma)
   y [app/prisma/seed.ts](../app/prisma/seed.ts) en split-view contra el
   plan ajustado para validar visualmente que el modelo propuesto no
   choca con relaciones existentes.
3. Ejecutar mentalmente el flujo de migración: `migrate dev --create-only`
   → editar SQL con índice parcial + INSERT entidad "Sin asignar" + UPDATE
   voluntarios → `migrate dev` → `prisma generate` → `npm run build`.
   Si el build pasa sin tocar schema, la auditoría es correcta y Fase A
   puede empezar.

---

## Archivos críticos referenciados

Sólo lectura (auditoría, no se modifican):
- [app/prisma/schema.prisma](../app/prisma/schema.prisma)
- [app/prisma/seed.ts](../app/prisma/seed.ts)
- [app/prisma/migrations/20260504175350_perfiles_empleado/migration.sql](../app/prisma/migrations/20260504175350_perfiles_empleado/migration.sql)
- [app/src/lib/audit.ts](../app/src/lib/audit.ts)
- [app/src/lib/turnos-solape.ts](../app/src/lib/turnos-solape.ts)
- [app/src/lib/authz.ts](../app/src/lib/authz.ts)
- [app/src/lib/action-result.ts](../app/src/lib/action-result.ts)
- [app/src/proxy.ts](../app/src/proxy.ts)
- [app/src/app/layout.tsx](../app/src/app/layout.tsx)
- [app/src/app/(app)/layout.tsx](../app/src/app/(app)/layout.tsx)
- [app/src/app/(app)/admin/empleados/schema.ts](../app/src/app/(app)/admin/empleados/schema.ts)
- [app/src/app/(app)/admin/empleados/_components/empleado-form.tsx](../app/src/app/(app)/admin/empleados/_components/empleado-form.tsx)
- [app/src/app/(app)/turnos/actions.ts](../app/src/app/(app)/turnos/actions.ts)
- [app/src/components/ui/](../app/src/components/ui/)

A modificar tras aprobación:
- [plans/quiero-a-adir-un-m-dulo-fizzy-boot.md](quiero-a-adir-un-m-dulo-fizzy-boot.md) (los 6 ajustes).
