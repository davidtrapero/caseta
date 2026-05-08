# Evolutivos empleados, tipos, turnos y navegación

## Context

Bloque de evolutivos pedidos por el usuario para mejorar la operativa diaria de la app de casetas:

- Hoy el "tipo de empleado" es un enum Prisma (`PerfilEmpleado`) con colores hardcoded en [perfiles.ts](app/src/app/(app)/turnos/_lib/perfiles.ts#L41-L70). No se pueden añadir/quitar tipos ni cambiar colores sin redeploy. El usuario quiere gestionar tipos y colores desde admin.
- Al editar un turno solo se cambia el horario; las plazas (cupos por tipo) ya existen como modelo `TurnoPlaza` pero solo se editan al crearlo.
- Al duplicar un día/semana se copian las asignaciones, sin opción a duplicar "vacío". Además, hoy **no se copian las plazas** — bug latente que aprovechamos para corregir.
- La edición de empleado no muestra email (aunque se captura en solicitudes), pide DNI a voluntarios, no permite ver/quitar turnos asignados, y la pantalla de perfil es poco visual.
- El listado de empleados no tiene filtros y no agrupa los turnos por empleado.
- Empleados es un tab del admin; conceptualmente es operativo y debe estar en el sidebar lateral, no escondido en admin.

Resultado esperado: tipos de empleado editables desde admin con color propio, edición de turno y duplicación más completas, edición de empleado con email/turnos/perfil vistoso, listado filtrable con turnos colapsables y empleados accesible desde el sidebar.

Decisiones tomadas con el usuario: tabla `TipoEmpleado` (no enum + tabla auxiliar), descartar listado WhatsApp, mover empleados a sidebar (no duplicar), turnos del empleado solo edición activa desde hoy.

## Orden de implementación

A bloquea casi todo el resto. G es trivial e independiente. Recomendado: **A → B → G → C → D → E → F**.

---

## A. Migración `PerfilEmpleado` enum → tabla `TipoEmpleado`

### Schema ([app/prisma/schema.prisma](app/prisma/schema.prisma))

Nuevo modelo (sustituye al enum L22-28):

- `TipoEmpleado { id, slug @unique, label, labelCorto, colorHex, orden, esVoluntario, activo, createdAt, updatedAt }` — `slug` clave estable para código; `colorHex` formato `#RRGGBB`; `esVoluntario` reemplaza la comparación `perfil === 'voluntario'`.
- `@@index([orden])`.

Cambios en modelos existentes:

- `Empleado` (L144-159): quitar `perfil PerfilEmpleado`, añadir `tipoEmpleadoId String` + relación `Restrict` + `@@index([tipoEmpleadoId])`.
- `TurnoPlaza` (L188-197): quitar `perfil PerfilEmpleado`, añadir `tipoEmpleadoId String` + relación `Restrict`. Cambiar unique `[turnoId, perfil]` → `[turnoId, tipoEmpleadoId]`.
- Eliminar `enum PerfilEmpleado` solo en la segunda migración.

### Migración de datos (dos pasos)

1. **Additive**: crear `TipoEmpleado`, añadir columnas FK nullable, INSERT seed de los 5 tipos con sus colores HSL convertidos a hex y `esVoluntario=true` solo en voluntario, UPDATE empleados/plazas mapeando por slug, NOT NULL final.
2. **Drop**: eliminar columnas antiguas `perfil`, eliminar enum, recrear unique de `TurnoPlaza`.

Mantener `prisma/seed.ts` con `upsert` por slug para entornos limpios.

### Refactor de código

- [perfiles.ts](app/src/app/(app)/turnos/_lib/perfiles.ts): eliminar mapas hardcoded; exportar helpers `colorFor(tipo)`, `labelFor(tipo)`, tipo `TipoEmpleadoLite`. Cargar `TipoEmpleado[]` server-side y pasar por props (no context global, mantiene SSR limpio).
- Validación voluntario: en [admin/empleados/actions.ts](app/src/app/(app)/admin/empleados/actions.ts), [admin/empleados/_components/empleado-form.tsx](app/src/app/(app)/admin/empleados/_components/empleado-form.tsx) y [admin/solicitudes/actions.ts](app/src/app/(app)/admin/solicitudes/actions.ts) — sustituir literal por lookup del tipo y comprobar `tipo.esVoluntario`.
- Schemas Zod: `perfil: z.enum(...)` → `tipoEmpleadoId: z.string().cuid()`. Regla "voluntario ⇒ jornal NULL + entidad NOT NULL" en `superRefine` tras lookup en la action.
- Grep global obligatorio antes de cerrar A: `PerfilEmpleado`, `'voluntario'`, `'vigilante'`, `'coordinador'`, `'trabajador'`, `'ayudante'`, `PERFIL_COLORES`, `PERFIL_LABEL`, `PERFIL_ORDEN`.

### Riesgos

- `<input name="perfil">` huérfanos en formularios.
- `turnos/asistencias/_lib/query.ts` agrupa por perfil — refactor a `tipoEmpleadoId`.
- Datos en Neon: ensayar la migración en branch antes de main.

---

## B. CRUD `/admin/tipos-empleado`

### Nuevos paths

- [app/src/app/(app)/admin/tipos-empleado/page.tsx](app/src/app/(app)/admin/tipos-empleado/page.tsx) — listado con badge color + orden + flags + acciones.
- `app/src/app/(app)/admin/tipos-empleado/actions.ts` — `crearTipoEmpleadoAction`, `actualizarTipoEmpleadoAction`, `eliminarTipoEmpleadoAction`, `reordenarTiposAction`.
- `app/src/app/(app)/admin/tipos-empleado/schemas.ts` — Zod: `slug` regex slug, `colorHex` regex `^#[0-9a-fA-F]{6}$`.
- `_components/TipoEmpleadoForm.tsx` con color picker (`input type="color"` + texto hex).

### Modificar

- [admin/layout.tsx](app/src/app/(app)/admin/layout.tsx) L4-11: añadir tab "Tipos de empleado", quitar "Empleados" (apartado G).

### Reglas

- Patrón estándar: `requireRole('admin')` → `parseForm` → `withAuditContext(prisma...)` → `revalidatePath` → `ActionResult`.
- Borrado: soft (`activo=false`) si tiene empleados o plazas. Hard solo si `_count.empleados === 0 && _count.plazas === 0`.
- Slug inmutable tras creación.

---

## C. Editar plazas en `DialogoEditarTurno`

### Modificar

- [DialogoEditarTurno.tsx](app/src/app/(app)/turnos/_components/DialogoEditarTurno.tsx): replicar el bloque de plazas de [DialogoNuevoTurno.tsx#L229-L254](app/src/app/(app)/turnos/_components/DialogoNuevoTurno.tsx#L229-L254). Prellenar con plazas actuales del turno.
- [turnos/actions.ts](app/src/app/(app)/turnos/actions.ts): crear wrapper `actualizarTurnoYPlazasAction` que en una `prisma.$transaction` haga update de horario + diff de plazas (reusa lógica de [actualizarPlazasAction L537-L581](app/src/app/(app)/turnos/actions.ts#L537-L581)). Atomicidad + un solo `revalidatePath`.

### Riesgo

- Disminuir cantidad por debajo de empleados ya asignados de ese tipo: validar y devolver error explícito en `ActionResult` (no romper asignaciones existentes).

---

## D. Duplicar con flag de asignaciones

### Modificar

- [turnos/actions.ts `validarYCopiarTurnos` L594-L688](app/src/app/(app)/turnos/actions.ts#L594-L688): añadir parámetro `copiarAsignaciones: boolean`. **Siempre** copiar `TurnoPlaza` (corrige bug actual). Si `copiarAsignaciones=true`, además copiar `TurnoEmpleado` con `asistio=false`.
- `duplicarDiaAction` y `duplicarSemanaAction`: aceptar el flag desde el form.
- Schemas Zod en `turnos/schemas.ts`: añadir booleano.
- UI: checkbox "Copiar también asignaciones de empleados" (default `false`) en [DialogoDuplicarDia.tsx](app/src/app/(app)/turnos/_components/DialogoDuplicarDia.tsx) y [BotonDuplicarSemana.tsx](app/src/app/(app)/turnos/_components/BotonDuplicarSemana.tsx).

---

## E. Edición empleado mejorada

### Schema

- `Empleado`: añadir `email String?` (migración additive aparte).

### Modificar [admin/solicitudes/actions.ts L83-L101](app/src/app/(app)/admin/solicitudes/actions.ts#L83-L101)

- Al crear/actualizar Empleado en aprobación, propagar `email` desde la solicitud si existe. Si Empleado existe sin email, update solo del campo.

### Modificar [empleado-form.tsx](app/src/app/(app)/admin/empleados/_components/empleado-form.tsx)

- L149-173: cambiar botones de perfil a chips grandes generados desde `tiposEmpleado` (prop), con `style.backgroundColor = colorHex` cuando seleccionado, borde del color cuando no, punto de color visible. Ordenados por `tipo.orden`.
- Añadir campo email editable.
- L175-193 (entidad): condicional `tipoSeleccionado?.esVoluntario`.
- DNI: ocultar si voluntario. Validar también server-side (ignorar DNI o no exigirlo).

### Sección "Turnos asignados"

- Nuevo `app/src/app/(app)/empleados/[id]/_components/TurnosAsignadosEmpleado.tsx` (ruta tras G).
- Server query `_lib/turnos-empleado.ts`: turnos del empleado con `fechaInicio >= startOfDay(today)` y `edicion.estado = 'activa'`. Incluir `tipoEmpleado`, caseta, fechas.
- Cada fila con botón X que llama [`desasignarEmpleadoAction` L346](app/src/app/(app)/turnos/actions.ts#L346). Asegurar que la action revalida también la página del empleado (añadir `revalidatePath('/empleados/[id]')` o equivalente).

---

## F. Listado empleados con filtros + turnos colapsables

### Modificar `page.tsx` (tras mover en G)

- Server component que lee `searchParams`: `q` (LIKE sobre nombre/DNI/teléfono), `tipoId`, `soloActivos` (default true).
- Una sola query Prisma con `include`: `empleado.findMany({ where, include: { tipoEmpleado: true, turnos: { where: { turno: { fechaInicio: { gte: hoy }, edicion: { estado: 'activa' } } }, include: { turno: { include: { caseta: true } } }, orderBy: { turno: { fechaInicio: 'asc' } } } } })`. Evita N+1.

### Nuevos componentes

- `_components/EmpleadosFilters.tsx` (client) — input con `useTransition` + `router.replace` con searchParams.
- `_components/EmpleadoCard.tsx` (server) — fila + colapsable shadcn con turnos futuros.

### Riesgos

- Coste si crece el dataset: paginar (umbral 50) si hace falta.
- Búsqueda case-insensitive y trim para DNI/teléfono.

---

## G. Mover empleados al sidebar

### Decisión de ruta

Mover físicamente a `app/src/app/(app)/empleados/...` (URL refleja que ya no es admin-only). Conservar redirect 301 desde `/admin/empleados/:path*`.

### Modificar

- [layout.tsx](app/src/app/(app)/layout.tsx) L10-18: añadir `{ href: '/empleados', label: 'Empleados', roles: ['admin', 'gerente'] }`.
- [sidebar-nav.tsx](app/src/app/(app)/_components/sidebar-nav.tsx) L25-33: añadir `'/empleados': Users` al `ICON_MAP`.
- [admin/layout.tsx](app/src/app/(app)/admin/layout.tsx) L4-11: quitar tab "Empleados".
- Mover carpeta `admin/empleados` → `empleados`. Ajustar imports relativos.
- `next.config.ts`: redirect 301 `/admin/empleados/:path*` → `/empleados/:path*`.

### Permisos

- Mantener `requireRole(['admin', 'gerente'])` en las actions; cajeros siguen siendo solo lectura.

---

## Critical files

- [app/prisma/schema.prisma](app/prisma/schema.prisma)
- [app/src/app/(app)/turnos/_lib/perfiles.ts](app/src/app/(app)/turnos/_lib/perfiles.ts)
- [app/src/app/(app)/turnos/actions.ts](app/src/app/(app)/turnos/actions.ts)
- [app/src/app/(app)/turnos/_components/DialogoEditarTurno.tsx](app/src/app/(app)/turnos/_components/DialogoEditarTurno.tsx)
- [app/src/app/(app)/turnos/_components/DialogoDuplicarDia.tsx](app/src/app/(app)/turnos/_components/DialogoDuplicarDia.tsx)
- [app/src/app/(app)/turnos/_components/BotonDuplicarSemana.tsx](app/src/app/(app)/turnos/_components/BotonDuplicarSemana.tsx)
- [app/src/app/(app)/admin/empleados/actions.ts](app/src/app/(app)/admin/empleados/actions.ts)
- [app/src/app/(app)/admin/empleados/_components/empleado-form.tsx](app/src/app/(app)/admin/empleados/_components/empleado-form.tsx)
- [app/src/app/(app)/admin/empleados/page.tsx](app/src/app/(app)/admin/empleados/page.tsx)
- [app/src/app/(app)/admin/solicitudes/actions.ts](app/src/app/(app)/admin/solicitudes/actions.ts)
- [app/src/app/(app)/admin/layout.tsx](app/src/app/(app)/admin/layout.tsx)
- [app/src/app/(app)/layout.tsx](app/src/app/(app)/layout.tsx)
- [app/src/app/(app)/_components/sidebar-nav.tsx](app/src/app/(app)/_components/sidebar-nav.tsx)
- `app/next.config.ts`

## Verification

1. **Build & types**: `npm run build` limpio, sin referencias a `PerfilEmpleado`.
2. **Lint**: `npm run lint`.
3. **Prisma**: `npx prisma migrate dev` en branch dev de Neon. Ambas migraciones (additive → drop) en orden. `npx prisma generate`.
4. **Seed**: `npx tsx prisma/seed.ts` en BD vacía → 5 tipos con colores correctos.
5. **Casos manuales**:
   - Crear/editar/eliminar TipoEmpleado; intentar borrar uno con empleados (rechazo o soft).
   - Cambiar color → badges/calendario reflejan cambio sin redeploy.
   - Editar turno: cambiar plazas; reducir cantidad por debajo de asignados → debe fallar.
   - Duplicar día sin asignaciones / con asignaciones → plazas siempre se copian.
   - Aprobar solicitud con email → empleado lo muestra; entidad obligatoria si voluntario; DNI oculto si voluntario.
   - Listado empleados: filtrar por nombre/DNI/teléfono/tipo; expandir turnos futuros; X desasigna y revalida.
   - Sidebar: "Empleados" visible y activo; tab admin retirado; redirect funciona.
6. **Auditoría**: nuevas actions corren dentro de `withAuditContext` (entradas en `AuditLog`).
