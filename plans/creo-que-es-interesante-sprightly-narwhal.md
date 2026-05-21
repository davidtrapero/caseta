# Productos compartidos entre casetas

## Contexto

Hoy `Producto` pertenece a UNA caseta ([schema.prisma:260-275](app/prisma/schema.prisma#L260-L275)). El usuario que da de alta el catálogo (ver captura del formulario en [productos/_components/producto-form.tsx](app/src/app/(app)/inventario/productos/_components/producto-form.tsx)) tiene que duplicar manualmente cada producto que se vende en más de una caseta — engorroso y propenso a divergencias (unidad, nombre).

El cambio: pasar `Producto` a entidad **transversal**, vinculada N:M con `Caseta` mediante una tabla intermedia. El **stock y los movimientos siguen siendo por caseta** (no se tocan): solo cambia "qué productos figuran en el catálogo de qué casetas".

Decisiones acordadas:
- **Migración no fusiona duplicados**: cada `Producto` actual queda como producto independiente vinculado a su caseta original. La UI permite a partir de ahora vincular a más casetas.
- **Sin unicidad global de nombre**: dos productos pueden llamarse igual (la migración va a generar duplicados legítimos por nombre).
- **`activo` sigue siendo global** en `Producto` — desactivar oculta el producto en todas las casetas vinculadas.

## Modelo de datos

### Schema ([app/prisma/schema.prisma](app/prisma/schema.prisma))

`Producto`:
- Eliminar `casetaId` y la relación `caseta`.
- Eliminar `@@unique([casetaId, nombre])`.
- Sustituir `caseta` por `casetas: ProductoCaseta[]`.

Tabla intermedia nueva:

```prisma
model ProductoCaseta {
  id         String   @id @default(cuid())
  productoId String
  casetaId   String
  createdAt  DateTime @default(now())

  producto Producto @relation(fields: [productoId], references: [id], onDelete: Cascade)
  caseta   Caseta   @relation(fields: [casetaId], references: [id], onDelete: Cascade)

  @@unique([productoId, casetaId])
  @@index([casetaId])
}
```

`Caseta`: añadir `productos: ProductoCaseta[]` (sustituye al actual `productos: Producto[]`).

`Stock`, `MovimientoStock`, `DetallePedido`: **no cambian**. Siguen apuntando a `productoId` y `casetaId` (donde aplique) por separado.

### Migración Prisma

`npx prisma migrate dev --name producto_multicaseta`. La migración debe:

1. `CREATE TABLE "ProductoCaseta"` con la unique e índice.
2. `INSERT INTO "ProductoCaseta" (id, productoId, casetaId, createdAt) SELECT gen_random_uuid()::text, id, "casetaId", "createdAt" FROM "Producto"` — un registro por producto existente preservando su caseta original.
3. `DROP INDEX` del unique `Producto_casetaId_nombre_key`.
4. `ALTER TABLE "Producto" DROP COLUMN "casetaId"`.

Prisma genera DROP COLUMN al final automáticamente si el campo desaparece del schema; revisar el SQL generado y reordenar manualmente para que el `INSERT` ocurra **antes** del `DROP COLUMN`.

## Cambios por área

### Productos — actions ([inventario/productos/actions.ts](app/src/app/(app)/inventario/productos/actions.ts))

`crearProductoAction` (líneas 16-49):
- `casetaId: string` → `casetaIds: string[]` (mínimo 1).
- Validar que **todas** las casetas existen (un solo `findMany` con `where: { id: { in: casetaIds } }`).
- Crear `Producto` con `casetas: { create: casetaIds.map(id => ({ casetaId: id })) }` en una sola operación.

`actualizarProductoAction` (líneas 51-87):
- Sincronizar diferencias en `ProductoCaseta` con dos operaciones dentro de `$transaction`: `deleteMany` para las casetas removidas y `createMany` para las añadidas. Calcular el diff en memoria leyendo `producto.casetas`.

`toggleActivoProductoAction`: sin cambios.

### Productos — schema Zod ([productos/schema.ts](app/src/app/(app)/inventario/productos/schema.ts))

- `casetaId: z.string().min(1)` → `casetaIds: z.array(z.string().min(1)).min(1, "Selecciona al menos una caseta")`.
- Recordar la regla de memoria: usar `z.string().min(1)`, nunca `z.cuid`/`z.uuid`.
- En `formDataToObject`, `casetaIds` viene como múltiples valores con la misma key — usar `formData.getAll("casetaIds")` o un campo hidden JSON. Convención más simple: hidden `<input type="hidden" name="casetaIds" value={JSON.stringify(seleccionadas)} />` y `z.preprocess(JSON.parse, z.array(...))`.

### Productos — formulario ([_components/producto-form.tsx](app/src/app/(app)/inventario/productos/_components/producto-form.tsx))

- Reemplazar el `<select>` de caseta única por un grupo de **checkboxes** (una por caseta activa). Mejor UX que un multiselect nativo en back-office.
- Estado controlado en cliente (`useState<Set<string>>`), volcado al envío vía hidden input JSON.
- Si viene `casetaPorDefecto` como query param ([productos/nuevo/page.tsx:15,42](app/src/app/(app)/inventario/productos/nuevo/page.tsx#L15)), pre-marcarla.
- En edición ([productos/[id]/page.tsx:36](app/src/app/(app)/inventario/productos/[id]/page.tsx#L36)): el padre carga `producto.casetas: { casetaId }[]` y los pasa como `initial.casetaIds`.

### Productos — listado ([productos/page.tsx](app/src/app/(app)/inventario/productos/page.tsx))

- Línea 60, 67: filtro por caseta pasa a `where: { casetas: { some: { casetaId: filtroCaseta } } }`.
- Líneas 46-56 (orderBy): `caseta: { nombre }` ya no existe. Eliminar la opción de ordenar por "caseta" (el sort tiene poco sentido cuando hay N casetas por fila) o sustituir por nombre de la primera caseta — recomendado **eliminar** del array `allowedSorts` y de los `SortableHeader` (líneas 37, 126-133).
- `include: { caseta: ... }` (línea 61) → `include: { casetas: { include: { caseta: { select: { nombre: true } } }, orderBy: { caseta: { nombre: "asc" } } } }`.
- Render de la celda "Caseta" (línea 153-155): mostrar lista separada por comas, o chips si son varias. Si es solo una, igual que ahora.

### Stock ([inventario/stock/actions.ts](app/src/app/(app)/inventario/stock/actions.ts))

`ajustarStockAction` (líneas 30-41):
- Hoy lee `producto.casetaId` y compara con `data.casetaId`. Cambiar a:
  ```ts
  const vinculo = await prisma.productoCaseta.findUnique({
    where: { productoId_casetaId: { productoId, casetaId } },
    select: { id: true },
  });
  if (!vinculo) return { ok: false, error: "El producto no está disponible en esta caseta.", values };
  ```
- También verificar que el producto existe y está activo (en una sola query si se prefiere).

### Stock — listado ([inventario/stock/page.tsx](app/src/app/(app)/inventario/stock/page.tsx))

- Línea 37 filtra productos por `casetaId`. Cambiar a `where: { activo: true, casetas: { some: { casetaId } } }` para listar productos vinculados a la caseta seleccionada.

### Pedidos — validador ([inventario/pedidos/actions.ts:26-46](app/src/app/(app)/inventario/pedidos/actions.ts#L26-L46))

`validarProductosEnCaseta`:
- En lugar de comprobar `p.casetaId !== casetaId`, hacer un query a `productoCaseta`:
  ```ts
  const vinculos = await prisma.productoCaseta.findMany({
    where: { casetaId, productoId: { in: productoIds } },
    select: { productoId: true },
  });
  const vinculados = new Set(vinculos.map(v => v.productoId));
  ```
- Conservar la validación de `activo` (sigue siendo flag global). Conservar también la comprobación de existencia.
- Mensaje de error: "Algún producto no está vinculado a esta caseta." (más preciso que el actual).

### Pedidos — formulario ([_components/pedido-form.tsx:96](app/src/app/(app)/inventario/pedidos/_components/pedido-form.tsx#L96))

- El filtro `productos.filter(p => p.casetaId === casetaId)` deja de funcionar. La página padre ([nuevo/page.tsx:39](app/src/app/(app)/inventario/pedidos/nuevo/page.tsx#L39), [[id]/page.tsx:80](app/src/app/(app)/inventario/pedidos/[id]/page.tsx#L80)) debe cargar productos con sus casetas vinculadas:
  ```ts
  prisma.producto.findMany({
    where: { activo: true },
    include: { casetas: { select: { casetaId: true } } },
  });
  ```
- En cliente: `productos.filter(p => p.casetas.some(c => c.casetaId === casetaIdActual))`.

### Movimientos ([inventario/movimientos/page.tsx:113-116](app/src/app/(app)/inventario/movimientos/page.tsx#L113-L116))

- Mismo patrón: filtro `where: { casetaId }` en productos pasa a `where: { casetas: { some: { casetaId } } }`.

### Seed ([prisma/seed.ts](app/prisma/seed.ts))

- Si crea productos hoy con `casetaId`, adaptar a la nueva forma: `casetas: { create: [{ casetaId }] }`. Verificar antes de tocar.

### AuditLog

- La extensión Prisma de auditoría ([app/src/lib/audit.ts](app/src/lib/audit.ts)) registra cualquier escritura. Si hoy filtra explícitamente las entidades a auditar, **añadir `ProductoCaseta`** a la allowlist para registrar vinculaciones/desvinculaciones. Si es allowlist abierta, no hace falta nada.

## Archivos críticos a modificar

- [app/prisma/schema.prisma](app/prisma/schema.prisma) — modelo `Producto`, `Caseta`, nuevo `ProductoCaseta`.
- [app/prisma/migrations/](app/prisma/migrations/) — migración con backfill manual.
- [app/src/app/(app)/inventario/productos/actions.ts](app/src/app/(app)/inventario/productos/actions.ts)
- [app/src/app/(app)/inventario/productos/schema.ts](app/src/app/(app)/inventario/productos/schema.ts)
- [app/src/app/(app)/inventario/productos/_components/producto-form.tsx](app/src/app/(app)/inventario/productos/_components/producto-form.tsx)
- [app/src/app/(app)/inventario/productos/page.tsx](app/src/app/(app)/inventario/productos/page.tsx)
- [app/src/app/(app)/inventario/productos/nuevo/page.tsx](app/src/app/(app)/inventario/productos/nuevo/page.tsx)
- [app/src/app/(app)/inventario/productos/[id]/page.tsx](app/src/app/(app)/inventario/productos/[id]/page.tsx)
- [app/src/app/(app)/inventario/stock/actions.ts](app/src/app/(app)/inventario/stock/actions.ts)
- [app/src/app/(app)/inventario/stock/page.tsx](app/src/app/(app)/inventario/stock/page.tsx)
- [app/src/app/(app)/inventario/pedidos/actions.ts](app/src/app/(app)/inventario/pedidos/actions.ts)
- [app/src/app/(app)/inventario/pedidos/_components/pedido-form.tsx](app/src/app/(app)/inventario/pedidos/_components/pedido-form.tsx)
- [app/src/app/(app)/inventario/pedidos/nuevo/page.tsx](app/src/app/(app)/inventario/pedidos/nuevo/page.tsx)
- [app/src/app/(app)/inventario/pedidos/[id]/page.tsx](app/src/app/(app)/inventario/pedidos/[id]/page.tsx)
- [app/src/app/(app)/inventario/movimientos/page.tsx](app/src/app/(app)/inventario/movimientos/page.tsx)
- [app/prisma/seed.ts](app/prisma/seed.ts) (verificar)

## Verificación

1. `npx prisma migrate dev --name producto_multicaseta` contra branch dev de Neon. Verificar en SQL que `ProductoCaseta` tiene N filas = nº de productos previos y que ningún producto quedó huérfano: `SELECT COUNT(*) FROM "Producto" p WHERE NOT EXISTS (SELECT 1 FROM "ProductoCaseta" pc WHERE pc."productoId" = p.id)` debe ser 0.
2. `npm run lint && npm run build` desde `app/`.
3. `npm run dev` y manualmente:
   - Crear producto nuevo seleccionando 2 casetas — verificar que aparece en /inventario/stock filtrando por cada una.
   - Editar producto existente: añadir una segunda caseta. Verificar que aparece en /inventario/productos con ambas, y que en /inventario/stock filtrado por la nueva caseta sale (con stock 0).
   - Editar y quitar una caseta. Comprobar que el `Stock` con cantidad>0 NO se borra (es CASCADE de Caseta solo, no de la vinculación) — si se quiere bloquear desvinculación con stock no-cero, validarlo en `actualizarProductoAction`.
   - Crear pedido en caseta A: el selector de productos solo muestra los vinculados a A.
   - Ajustar stock de un producto en una caseta NO vinculada vía URL manipulada: debe rechazar con "El producto no está disponible en esta caseta".
   - Toggle de activo: el producto desaparece del selector en TODAS las casetas vinculadas.
4. Inspeccionar `AuditLog` tras crear/editar para confirmar que las vinculaciones se registran (o asumir que no si están fuera del filtro).
