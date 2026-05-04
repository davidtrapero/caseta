# Próximos pasos tras cerrar Fase 4 (Caja)

## Contexto

La Fase 4 (Módulo Caja: cierres diarios, gastos, nóminas, balance) ha quedado cerrada con 4 commits en `main` y `npm run build` limpio. Siguiendo el plan maestro [`plans/lanza-un-agente-arquitecto-optimized-finch.md`](lanza-un-agente-arquitecto-optimized-finch.md), las fases restantes son **Fase 3 (Inventario)** — todavía placeholder en [`app/src/app/(app)/inventario/page.tsx`](../app/src/app/(app)/inventario/page.tsx) — y **Fase 5 (Testing E2E)**.

El plan maestro numeraba Inventario como "Fase 3", pero se desarrolló después de Caja porque los flujos de caja eran más urgentes. Por coherencia con el historial de commits (`fase 3.5` ya usado para perfiles de empleado) llamaremos a este bloque **"Fase 5 — Módulo Inventario"** y al cierre con tests **"Fase 6 — Testing"**.

El schema Prisma ya tiene todas las entidades de inventario modeladas ([`app/prisma/schema.prisma:205-309`](../app/prisma/schema.prisma)): `Producto`, `Stock`, `MovimientoStock`, `TipoMovimiento` (entrada/ajuste), `Proveedor`, `Pedido`, `DetallePedido`, `EstadoPedido`. **No hace falta migración de schema** para esta fase.

---

## Fase 5 — Módulo Inventario

Outcome: digitalizar el ciclo `productos → pedidos → recepción → stock` por caseta, con historial auditable de movimientos.

### 5A — Catálogo de productos por caseta

Estructura:

```
app/src/app/(app)/inventario/
  layout.tsx                        # subnav Productos / Stock / Pedidos / Movimientos
  page.tsx                          # redirect a /inventario/productos
  _components/inventario-tab.tsx    # clon de caja-tab.tsx
  _lib/caseta-filtro.ts             # helper compartido: selector de caseta activa (query ?caseta=...)
  productos/
    page.tsx                        # listado por caseta + filtro
    nuevo/page.tsx
    [id]/page.tsx
    actions.ts                      # crearProductoAction, actualizarProductoAction, toggleActivoAction
    schema.ts                       # Zod: nombre, unidad, casetaId, activo
    _components/producto-form.tsx
```

- `Producto` lleva `@@unique([casetaId, nombre])` — validar en Zod antes de crear.
- Un producto se puede desactivar pero no borrar (tiene relaciones con stock/pedidos/movimientos).
- Patrón de formulario idéntico a [`empleado-form.tsx`](../app/src/app/(app)/admin/empleados/_components/empleado-form.tsx): `useActionState` + `FormShell` + `FieldError/FormError`.
- Roles: admin/gerente crean y editan. Cajero solo lectura.

### 5B — Vista de stock + ajustes manuales

```
  stock/
    page.tsx                        # tabla: producto, unidad, cantidad actual (por caseta seleccionada)
    actions.ts                      # ajustarStockAction
    schema.ts
    _components/ajustar-stock-modal.tsx
```

- La fila `Stock` puede no existir todavía para un `(caseta, producto)`. La acción `ajustarStockAction` hace **upsert** sobre `Stock` y crea una fila en `MovimientoStock(tipo="ajuste", cantidad=nuevaCantidad−anterior, nota)` dentro de una transacción.
- Si `cantidad == anterior`, no crear movimiento (no hay cambio).
- Requiere edición activa: leer con `obtenerEdicionActiva()` de [`caja/_lib/edicion-activa.ts`](../app/src/app/(app)/caja/_lib/edicion-activa.ts) (mover a `src/lib/edicion.ts` para compartir con inventario; pequeño refactor).
- Roles: admin/gerente ajustan. Cajero solo lectura.

### 5C — Pedidos a proveedor con recepción transaccional

```
  pedidos/
    page.tsx                        # listado con badges de estado (pendiente/recibido/cancelado)
    nuevo/page.tsx                  # form multi-línea: proveedor, caseta, líneas de detalle
    [id]/page.tsx                   # detalle editable solo si pendiente
    actions.ts                      # crearPedidoAction, editarPedidoAction, recibirPedidoAction, cancelarPedidoAction
    schema.ts                       # Zod anidado: detalles[{productoId, cantidad, precioUnitario}]
    _components/pedido-form.tsx     # formulario con líneas dinámicas (array)
    _components/acciones-pedido.tsx
```

- `crearPedidoAction`: valida todas las líneas, calcula `total = Σ(cantidad × precioUnitario)`, persiste `Pedido` + `DetallePedido[]` en transacción. Estado inicial `pendiente`.
- **`recibirPedidoAction` (pieza crítica)**: en **una sola transacción** (confirmado con el usuario):
  1. `UPDATE Pedido SET estado='recibido', fechaRecepcion=now()`.
  2. Por cada `DetallePedido`: crear `MovimientoStock(tipo='entrada', cantidad, productoId, casetaId, edicionId, usuarioId)`.
  3. Upsert en `Stock`: `cantidad += detalle.cantidad`.
  - Si el pedido ya estaba en `recibido` o `cancelado`, devolver error (idempotencia).
- `cancelarPedidoAction`: solo permitido si `estado=pendiente`. No genera movimientos.
- Edición de pedido: solo permitida si `estado=pendiente`. Si está recibido, solo lectura.
- Patrón de referencia para líneas dinámicas: el formulario de turnos en [`DialogoNuevoTurno.tsx`](../app/src/app/(app)/turnos/_components/DialogoNuevoTurno.tsx) ya gestiona arrays (empleados asignados, plazas) — se reutiliza la misma técnica de `useState<Linea[]>` + hidden JSON serializado + Zod pipe a array (ver [`turnos/schema.ts:62-81`](../app/src/app/(app)/turnos/schema.ts)).
- Roles: admin/gerente crean y reciben. Cajero solo lectura.

### 5D — Historial de movimientos

```
  movimientos/
    page.tsx                        # tabla filtrable por caseta/producto/tipo/fecha, solo lectura
```

- Confirmado con el usuario: página dedicada (auditoría).
- Include: `producto.nombre`, `caseta.nombre`, `usuario.name`.
- Filtros vía `searchParams` (sin estado cliente): `?caseta=…&producto=…&tipo=entrada|ajuste&desde=YYYY-MM-DD&hasta=YYYY-MM-DD`.
- Paginación no necesaria para 2-5 usuarios; si en la práctica crece, añadir `take: 200` + enlace "ver más".
- Roles: admin/gerente/cajero todos pueden leer.

### Criterios de aceptación Fase 5

- `npm run build` pasa sin errores TS.
- Crear un producto, ajustar stock inicial → aparece en `/inventario/stock` y el movimiento de ajuste figura en `/inventario/movimientos`.
- Crear pedido, marcar recibido → stock sube, 1 movimiento `entrada` por cada línea, `fechaRecepcion` poblada.
- Intentar recibir un pedido ya recibido → error claro, no duplica movimientos.
- Cancelar pedido recibido → rechazado.
- `AuditLog` captura create/update/delete para Producto, Pedido, DetallePedido, MovimientoStock, Stock.

### Orden de commits Fase 5

1. `feat(inventario): fase 5A — catálogo de productos por caseta`
2. `feat(inventario): fase 5B — stock y ajustes manuales`
3. `feat(inventario): fase 5C — pedidos con recepción transaccional`
4. `feat(inventario): fase 5D — historial de movimientos`

Cada commit tras su propio `npm run build` verde.

---

## Fase 6 — Testing E2E

Outcome: red de pruebas para evitar regresiones cuando la feria esté en marcha.

Del plan maestro (sección "Fase 5 — Testing E2E paralelo"):

- **Back**: Vitest sobre Server Actions críticas — autorización por rol, validación Zod, solape de turnos, cálculo de nómina (voluntarios excluidos, pagadas no se sobreescriben), transacción de recepción de pedidos.
- **Front**: Playwright sobre flujos UI — login, crear edición → activarla → crear caseta → registrar cierre → ver balance.
- **E2E**: recorrido completo (crear edición → casetas → empleados → turnos con asistencia → cierre diario → calcular nóminas → marcar pagada → balance muestra números coherentes).

Decisiones a tomar antes de Fase 6:
- ¿Testing contra Neon branch de test o contra Postgres local en Docker? (Recomendado: branch Neon dedicado `test` para no requerir Docker en la máquina del usuario).
- Fixtures compartidos: crear [`app/src/test/fixtures.ts`](../app/src/test/) para sembrar datos mínimos reutilizables.

---

## Deuda cruzada pendiente (del plan maestro)

- **Rotar credenciales de Neon** tras el bootstrap inicial — no bloquea pero es higiene.
- **Evaluar monorepo vs. flat**: si aparece worker/CLI, migrar a Turborepo.

---

## Verificación end-to-end al cerrar Fase 5

1. Con edición activa, crear 2 productos para `Caseta A` y 1 para `Caseta B`.
2. Ajustar stock inicial de los 3 productos → comprobar que aparecen filas `Stock` y `MovimientoStock(tipo='ajuste')`.
3. Crear pedido a `Proveedor X` para `Caseta A` con 2 líneas → estado `pendiente`, `total` calculado.
4. Editar el pedido pendiente (cambiar cantidad de una línea) → `total` se recalcula.
5. Marcar recibido → `Stock` de los 2 productos sube, aparecen 2 filas `MovimientoStock(tipo='entrada')`, `fechaRecepcion` poblada.
6. Intentar cancelar el pedido recibido → error claro.
7. Navegar a `/inventario/movimientos` → ver las 5 filas (3 ajustes + 2 entradas) filtrables por caseta/producto/tipo.
8. `npm run build` pasa limpio.

---

## Prompt de arranque para sesión nueva

Pegar el bloque siguiente en una conversación limpia. Está pensado para ejecutarse con agentes Explore en paralelo durante el reconocimiento y luego un desarrollador secuencial por sub-fase, con commit al cierre de cada una.

```
Eres un desarrollador trabajando en "Caseta" — app Next.js 16 privada de back-office
para gestionar casetas de feria andaluza. Debes implementar la **Fase 5: Módulo
Inventario** siguiendo exactamente los patrones ya establecidos.

## STACK Y PATRONES OBLIGATORIOS

- Next.js 16 App Router + React 19 + TypeScript 5 strict + Tailwind 4
- Prisma 7 con @prisma/adapter-pg (driver JS, sin engine nativo)
- Better Auth 1.6 (auth de @/lib/auth)
- Zod 4 para toda validación
- shadcn/ui: componentes en app/src/components/ui/ (NO usar npx shadcn add — copiar manual)

Patrón obligatorio en Server Actions:
  "use server"
  await requireRole([...roles])                   // de @/lib/authz
  await withAuditContext(user.id, async () => {
    // validación Zod (parseForm)
    // operación Prisma
    revalidatePath(...)
    return { ok: true, data } | { ok: false, error, fieldErrors? }
  })

Retorno tipado: ActionResult<T> de @/lib/action-result.
Helpers: requireRole/getSession (@/lib/authz), withAuditContext (@/lib/audit),
prisma singleton (@/lib/prisma).

## ESTADO ACTUAL

Completado: Fases 0, 1, 2, 3, 3.5, 4 (Caja completa). El módulo Inventario
en app/src/app/(app)/inventario/page.tsx es todavía un placeholder vacío.
El schema Prisma ya tiene Producto, Stock, MovimientoStock, Proveedor,
Pedido, DetallePedido — NO hace falta migración.

Plan detallado: plans/estoy-de-acuerdo-con-purring-toast.md. LÉELO antes
de empezar — contiene la estructura de archivos esperada, reglas de
transacciones y reutilizaciones concretas.

## ORDEN DE EJECUCIÓN

Trabaja en este orden estricto: 5A → 5B → 5C → 5D.

Al cierre de CADA sub-fase:
1. `./node_modules/.bin/tsc --noEmit` desde app/ debe pasar limpio.
2. `npm run build` desde app/ (con NODE_EXTRA_CA_CERTS='C:\Users\dtrapero\all_certs_full.pem')
   debe pasar.
3. Crear un commit con mensaje: `feat(inventario): fase 5X — <descripción>`.
   Co-Author: Claude Opus 4.7 <noreply@anthropic.com>.

Al inicio de 5A: mover app/src/app/(app)/caja/_lib/edicion-activa.ts →
app/src/lib/edicion.ts y actualizar imports en caja/. Este refactor va
en el primer commit de Fase 5 (no commit aparte).

## PARALELIZACIÓN

En la fase de exploración inicial, lanza agentes Explore EN PARALELO
(misma respuesta, múltiples tool calls):
- Agente 1: patrones de Server Actions en turnos/ y caja/ (transacciones,
  validación Zod de arrays, uso de withAuditContext).
- Agente 2: patrones de UI — listados con tabla, formularios con
  useActionState, subnav por layout.
- Agente 3: helpers reutilizables en src/lib/ y componentes en
  admin/_components/.

Durante la implementación, trabaja secuencialmente (los archivos
dependen entre sí) pero agrupa reads independientes en llamadas
paralelas cuando sea posible.

## PUNTOS CRÍTICOS

1. **recibirPedidoAction (5C)**: transacción única que actualiza Pedido,
   crea N filas MovimientoStock(tipo='entrada') y hace upsert en Stock.
   Idempotente: si el pedido ya está recibido o cancelado, error.
2. **ajustarStockAction (5B)**: upsert Stock + crea MovimientoStock(
   tipo='ajuste') con la DIFERENCIA respecto al valor anterior (no el
   nuevo absoluto). Si no hay cambio, no crear movimiento.
3. **Ediciones activas**: obtenerEdicionActiva() (tras moverla a
   @/lib/edicion) al inicio de cualquier acción que escriba en
   MovimientoStock o Pedido.
4. **Producto no se borra**: solo se desactiva. Existencia de relaciones
   con stock/pedidos/movimientos lo impide.
5. **Roles**: admin/gerente crean y editan. Cajero solo lectura en todo
   inventario (confirmado con usuario).

## GOTCHAS DEL ENTORNO

- Proxy TLS corporativo: prepend NODE_EXTRA_CA_CERTS para cualquier fetch
  externo (build, prisma generate, npm install).
- Shadcn CLI bloqueado: copiar componentes manualmente si faltan.
- CWD del shell: los comandos se ejecutan desde la raíz del repo
  (c:\Proyectos\caseta); para compilar usa `cd app && ...` o rutas
  absolutas.
- Al terminar: reportar cualquier decisión ambigua y confirmar que los
  4 commits de Fase 5 están en main.
```

---

## Archivos críticos a reutilizar

- Autorización: [`app/src/lib/authz.ts`](../app/src/lib/authz.ts) (`requireRole`, `getSession`).
- Auditoría automática: [`app/src/lib/audit.ts`](../app/src/lib/audit.ts) (`withAuditContext`).
- Retorno tipado: [`app/src/lib/action-result.ts`](../app/src/lib/action-result.ts) (`parseForm`, `toActionError`).
- Componentes de página: [`app/src/app/(app)/admin/_components/page-header.tsx`](../app/src/app/(app)/admin/_components/page-header.tsx) (`SectionHeader`, `FormShell`, `EmptyState`, `FieldError`, `FormError`).
- Pestaña subnav: [`app/src/app/(app)/caja/_components/caja-tab.tsx`](../app/src/app/(app)/caja/_components/caja-tab.tsx) como plantilla directa.
- Edición activa: [`app/src/app/(app)/caja/_lib/edicion-activa.ts`](../app/src/app/(app)/caja/_lib/edicion-activa.ts) — mover a `src/lib/edicion.ts` al inicio de Fase 5 para uso compartido.
- Formulario con líneas dinámicas (para pedidos): patrón en [`turnos/schema.ts`](../app/src/app/(app)/turnos/schema.ts) (`empleadoIdsJson`, `plazasJson`) + [`DialogoNuevoTurno.tsx`](../app/src/app/(app)/turnos/_components/DialogoNuevoTurno.tsx).
