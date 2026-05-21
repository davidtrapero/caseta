# Auditoría de arquitectura — caseta

## Context

El usuario solicitó una auditoría general buscando puntos de optimización de código y decisiones de arquitectura mejorables. La app está en producción (Vercel + Neon), todos los módulos operativos, ~16 migraciones en 15 días — el modelo de dominio aún está estabilizándose.

**Alcance**: 3 exploradores en paralelo (datos/Prisma, seguridad/auth, frontend/UI). Hallazgos validados contra el código antes de incluirlos. Falsos positivos descartados (ver nota al final).

**Filtro aplicado**: solo se incluyen hallazgos con impacto real para una app de back-office con 2-5 usuarios concurrentes. Se descartan recomendaciones que serían over-engineering (Redis para rate-limit, queue para audit, etc.).

---

## Hallazgos por severidad

### 🔴 Alta — granularidad de permisos en módulo turnos

**Síntoma**: [turnos/actions.ts](app/src/app/(app)/turnos/actions.ts) tiene 12 usos de `turnos.semana.crear` cubriendo crear, editar, duplicar y eliminar. El catálogo [permissions/catalog.ts](app/src/lib/permissions/catalog.ts) define los permisos `turnos.semana.editar` y `turnos.semana.eliminar` pero **no se usan en ningún sitio** (verificado: 18 ocurrencias totales, 12 en `actions.ts` + 6 en `catalog.ts`).

**Impacto**: viola principio de menor privilegio. Imposible dar a un rol "ver y editar pero no borrar" — es todo o nada. Si en el futuro se quiere un rol "supervisor que arregla turnos sin poder borrarlos", hay que tocar 12 sitios.

**Acción**: en `turnos/actions.ts`, reemplazar `requirePermiso("turnos.semana.crear")` por el permiso correspondiente en cada acción según su semántica (crear/editar/eliminar). 30 min de trabajo, sin migración.

---

### 🟡 Media — duplicación masiva de formularios "toggle activo"

**Síntoma**: 7 variantes casi idénticas (`ToggleActivoProveedorForm`, `ToggleActivoProductoForm`, `ToggleActivoUsuarioForm`, `ToggleActivaCasetaForm`, `ToggleActivaEntidadForm`, etc.) en [admin/_components/](app/src/app/(app)/admin/) y [inventario/_components/](app/src/app/(app)/inventario/). La única diferencia es el `action` que invocan.

**Impacto**: ~200 LOC duplicadas. Cualquier mejora UX (loading state, confirmación, accesibilidad) requiere tocar 7 archivos.

**Acción**: extraer un `<GenericToggleForm action={...} label={...} />` a [src/components/](app/src/components/). Reemplazo mecánico, no requiere cambios de tipos.

---

### 🟡 Media — formatters Intl dispersos sin centralizar

**Síntoma**: 33 instancias de `Intl.NumberFormat`/`DateTimeFormat` con 14 nombres distintos (`FORMATO_EUR`, `FECHA_LARGA`, `HORA_TURNO`, `FECHA_RELATIVA`…) repartidos en 20 archivos. [(app)/page.tsx](app/src/app/(app)/page.tsx) define `FECHA_LARGA` localmente; [turnos/_lib/fechas.ts](app/src/app/(app)/turnos/_lib/fechas.ts) define los suyos; [caja/gastos/page.tsx](app/src/app/(app)/caja/gastos/page.tsx) redefine `FORMATO_EUR`.

**Riesgo concreto**: tratamiento de timezone inconsistente — algunos formatters fijan `timeZone: "UTC"` y otros no. En un dominio de feria (un evento que ocurre en una fecha exacta) esto es un bug latente.

**Acción**: crear `src/lib/intl.ts` exportando los 5-6 formatters reales (EUR, fecha corta, fecha larga, hora, fecha+hora). Migrar usos en una sola pasada.

---

### 🟡 Media — validación de solapes O(n²) dentro de transacción

**Síntoma**: [admin/solicitudes/actions.ts](app/src/app/(app)/admin/solicitudes/actions.ts) en `aprobarTurnosAction` abre transacción, hace `findMany` con ventana de ±24h y luego un loop O(n²) llamando a `detectarSolape` ([turnos-solape.ts](app/src/lib/turnos-solape.ts)) — todo dentro de la transacción.

**Impacto**: con 50-100 turnos en la ventana mantiene un row lock más tiempo del necesario. Para 2-5 usuarios concurrentes raramente bloquea, pero es la única operación con potencial de contención real en el sistema.

**Acción**: validar solapes **antes** de abrir la transacción; usar la transacción solo para los `create/update` finales. La detección no necesita estar dentro del lock — basta con releer y comparar antes del commit si nos preocupa la carrera (improbable a este volumen).

---

### 🟡 Media — `obtenerEdicionActiva()` se reconsulta en cada acción

**Síntoma**: [edicion.ts](app/src/lib/edicion.ts) se invoca en casi todas las acciones (pedidos, nóminas, gastos, cierres) sin caché. Cada server action que toca varias tablas hace 1 query extra solo para resolver edición activa.

**Impacto**: bajo en latencia (Neon es rápido), pero la edición activa cambia 1 vez al año — es el caso ideal para `unstable_cache` de Next o pasarla por props desde el layout raíz.

**Acción**: envolver con `unstable_cache(['edicion-activa'], { revalidate: 3600, tags: ['edicion'] })` y revalidar el tag al cerrar/abrir edición. ~10 min.

---

### 🟢 Baja — `recharts` cargado en bundle global

**Síntoma**: [caja/balance/_components/GraficoDiario.tsx](app/src/app/(app)/caja/balance/_components/GraficoDiario.tsx) importa `recharts` (~3MB tree-shaken). Como es un Server Component que renderiza un Client Component, recharts entra al bundle de cualquier ruta que pase por el segmento.

**Acción**: `dynamic(() => import('./GraficoDiario'), { ssr: false })` en la page de balance. Solo afecta a una ruta — riesgo de regresión nulo.

---

### 🟢 Baja — paginación con `<span aria-disabled>` en vez de `<button disabled>`

**Síntoma**: el último commit `1b833a1` ("fix: pagination") cambió `<Link>` condicional por `{cond ? <Link/> : <span aria-disabled>}` en [components/ui/data-table-pagination.tsx](app/src/components/ui/data-table-pagination.tsx).

**Acción**: usar `<button type="button" disabled>` — accesibilidad más limpia, comportamiento equivalente. 3 líneas.

---

### 🟢 Baja — auditoría de endpoints públicos pierde trazabilidad

**Síntoma**: [apuntarse/[token]/actions.ts](app/src/app/apuntarse/[token]/actions.ts) y [apuntarse-empleado/[token]/actions.ts](app/src/app/apuntarse-empleado/[token]/actions.ts) usan `withAuditContext("public:apuntarse", ...)` — cadena literal idéntica para todos los anónimos.

**Acción**: incluir el prefijo del token (`public:${token.slice(0,8)}`) o IP truncada para poder rastrear una solicitud sospechosa hasta el formulario que la generó. No requiere cambio de schema (`usuarioId` ya es string opcional).

---

## Decisiones existentes que NO recomiendo cambiar

Esto es tan importante como la lista de cambios. Estas son decisiones que parecen "deuda" pero a este volumen son correctas:

1. **Rate-limit en memoria** ([rate-limit.ts](app/src/lib/rate-limit.ts)). El propio archivo lo documenta: *"Aceptable para volumen de feria"*. Migrar a Redis sería over-engineering.
2. **AsyncLocalStorage para audit context**. A 2-5 usuarios concurrentes en Node runtime (no Edge), no hay riesgo real de pérdida de contexto.
3. **Server Actions sobre REST**. Patrón uniforme y bien aplicado.
4. **Permisos en BD editables**. Buena decisión — solo falta usarlos con la granularidad que ya existe (ver hallazgo 🔴).
5. **16 migraciones en 15 días**. No es deuda — es signo de que el dominio se está descubriendo. Consolidar ahora congelaría modelo aún en evolución.

---

## Falsos positivos descartados durante validación

Para que el informe no infle el alcance, dejo constancia de qué se verificó y resultó incorrecto:

- ❌ "Decimal inconsistente sin `@db.Decimal`": **falso**. Verificado en [schema.prisma:148,172](app/prisma/schema.prisma#L148): todos los campos monetarios tienen `@db.Decimal` explícito.
- ❌ "`setTheme` sin auth": técnicamente cierto, pero solo escribe la cookie de tema visual del propio cliente. Riesgo nulo, no merece cambio.
- ❌ "Tokens públicos predecibles": no se confirmó la generación; sin evidencia, no incluyo.

---

## Plan de ejecución sugerido (si se aprueba)

Trabajo ordenado por ratio impacto/esfuerzo:

| # | Hallazgo | Esfuerzo | Riesgo |
|---|---|---|---|
| 1 | Granularidad permisos turnos | 30 min | Bajo |
| 2 | Centralizar formatters Intl | 1 h | Bajo |
| 3 | Cache `obtenerEdicionActiva` | 15 min | Bajo |
| 4 | `dynamic` import recharts | 10 min | Nulo |
| 5 | Toggle form genérico | 1-2 h | Medio (toca 7 sitios) |
| 6 | Solapes fuera de transacción | 1 h | Medio (lógica de concurrencia) |
| 7 | Pagination `<button disabled>` | 5 min | Nulo |
| 8 | Audit context endpoints públicos | 15 min | Nulo |

**Recomendación**: ejecutar 1-4 y 7-8 como un solo PR de "limpieza arquitectónica" (~2h, bajo riesgo). Dejar 5 y 6 para PRs independientes con revisión propia.

## Verification

Esta auditoría es solo informe — no hay código que ejecutar. Si se procede con las acciones:
- Cada hallazgo aplicado debería pasar `npm run lint && npm run build` sin warnings nuevos.
- Para 🔴 (permisos): probar manualmente en /admin/usuarios cambiando permisos de un rol no-admin y verificando que las acciones esperadas se bloquean/permiten.
- Para 🟡 solapes: añadir test en [turnos-solape.test.ts](app/src/lib/turnos-solape.test.ts) cubriendo el caso de aprobación con solape, antes de mover lógica fuera de la transacción.
