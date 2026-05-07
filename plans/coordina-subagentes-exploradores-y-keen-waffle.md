# Plan: Mejoras de navegación, copy San Isidro y errores silenciosos

## Contexto

La app es para gestión de casetas en las fiestas de **San Isidro de Madrid**, no una feria genérica. El copy y placeholders actuales son genéricos ("Feria", "El Rocío"). Además hay tres problemas de experiencia: el sidebar marca múltiples items activos a la vez, Entidades tiene entrada directa en el sidebar cuando debería estar en la sección de Administración, y ~15 acciones devuelven errores silenciosos (el usuario no ve nada si algo falla).

---

## Punto 1 — Mover Entidades del sidebar a pestaña de Administración

**Archivos:**
- [`app/src/app/(app)/layout.tsx`](../app/src/app/(app)/layout.tsx) — eliminar item `{ href: "/admin/entidades", label: "Entidades", roles: [...] }` del array `NAV`
- [`app/src/app/(app)/admin/layout.tsx`](../app/src/app/(app)/admin/layout.tsx) — añadir `{ href: "/admin/entidades", label: "Entidades" }` al array `TABS` (entre Proveedores y Usuarios)
- [`app/src/app/(app)/_components/sidebar-nav.tsx`](../app/src/app/(app)/_components/sidebar-nav.tsx) — eliminar entrada `"/admin/entidades": Users` del `ICON_MAP` (línea 33)

---

## Punto 2 — Bug: múltiples items activos en sidebar

**Archivo:** [`app/src/app/(app)/_components/sidebar-nav.tsx`](../app/src/app/(app)/_components/sidebar-nav.tsx) línea 51

```tsx
// Antes:
const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

// Después:
const isActive = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
```

El `startsWith(href)` sin el `/` final hace que `/admin` coincida con `/admin/casetas`, etc. La corrección añade el separador de segmento.

> Puntos 1 y 2 tocan el mismo archivo — aplicar en una sola edición.

---

## Punto 3 — Actualizar copy a San Isidro de Madrid

| Archivo | Texto actual | Texto propuesto |
|---------|-------------|-----------------|
| [`app/src/app/layout.tsx`](../app/src/app/layout.tsx) ~L25 | `"App privada de gestión de casetas de feria."` | `"App privada de gestión de casetas de San Isidro de Madrid."` |
| [`app/src/app/(app)/admin/layout.tsx`](../app/src/app/(app)/admin/layout.tsx) L25 | `"Datos maestros de la feria"` | `"Datos maestros de San Isidro"` |
| [`app/src/app/(app)/_components/sidebar-nav.tsx`](../app/src/app/(app)/_components/sidebar-nav.tsx) L80 | `"Gestión de feria"` | `"San Isidro de Madrid"` |
| [`app/src/app/(app)/admin/ediciones/_components/edicion-form.tsx`](../app/src/app/(app)/admin/ediciones/_components/edicion-form.tsx) ~L69 | `placeholder="Feria 2026"` | `placeholder="San Isidro 2026"` |
| [`app/src/app/(app)/admin/ediciones/page.tsx`](../app/src/app/(app)/admin/ediciones/page.tsx) | `title="Ediciones de la feria"` | `title="Ediciones de San Isidro"` |
| [`app/src/app/(app)/admin/ediciones/nueva/page.tsx`](../app/src/app/(app)/admin/ediciones/nueva/page.tsx) ~L10 | `"...fechas de la feria."` | `"...fechas de San Isidro."` |
| [`app/src/app/(app)/admin/casetas/nueva/page.tsx`](../app/src/app/(app)/admin/casetas/nueva/page.tsx) ~L10 | `"Un punto de venta físico de la feria."` | `"Un punto de venta físico de San Isidro."` |
| [`app/prisma/seed.ts`](../app/prisma/seed.ts) ~L49 | `nombre: "Feria 2026"` | `nombre: "San Isidro 2026"` |
| [`app/src/test/fixtures.ts`](../app/src/test/fixtures.ts) ~L56 | `` `Feria ${anio}` `` | `` `San Isidro ${anio}` `` |
| [`app/src/app/(app)/admin/casetas/_components/caseta-form.tsx`](../app/src/app/(app)/admin/casetas/_components/caseta-form.tsx) ~L50 | `placeholder="Caseta El Rocío"` | `placeholder="Caseta La Pradera"` |
| [`app/src/app/(app)/admin/entidades/_components/entidad-form.tsx`](../app/src/app/(app)/admin/entidades/_components/entidad-form.tsx) ~L36 | `placeholder="Hermandad del Rocío"` | `placeholder="Peña Los Madriles"` |

---

## Punto 4 — Errores controlados que no llegan al usuario

**Patrón de referencia** (ya en producción):
- Acciones: `(_prev: ActionResult | null, formData: FormData): Promise<ActionResult>` con try-catch + `toActionError`
- Componentes: `useActionState(action, null)` + `{state && !state.ok ? <span className="text-xs text-destructive">{state.error}</span> : null}`
- Tipos en [`app/src/lib/action-result.ts`](../app/src/lib/action-result.ts): `ActionResult<T = undefined>`, `toActionError`

### Grupo A — Toggle actions (5 pares acción/componente)

| Acción | Componente |
|--------|-----------|
| `admin/empleados/actions.ts` — `toggleActivoEmpleadoAction` | `admin/empleados/_components/toggle-activo.tsx` |
| `admin/proveedores/actions.ts` — `toggleActivoProveedorAction` | `admin/proveedores/_components/toggle-activo.tsx` |
| `admin/entidades/actions.ts` — `desactivarEntidadAction`, `reactivarEntidadAction` | `admin/entidades/_components/toggle-activa.tsx` |
| `inventario/productos/actions.ts` — `toggleActivoProductoAction` | `inventario/productos/_components/toggle-activo.tsx` |
| `admin/ediciones/actions.ts` — `toggleActivaAction` | `admin/ediciones/_components/toggle-activa.tsx` |

**Cambio en cada acción:**
```ts
export async function toggleActivoAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Identificador inválido." };
  try {
    const { user } = await requireRole([...]);
    // lógica existente
    revalidatePath("...");
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err);
  }
}
```

**Cambio en cada componente:**
- Añadir `"use client"` si no la tiene
- Sustituir `action={toggleAction}` por `useActionState(toggleAction, null)`
- Añadir `{state && !state.ok && <span className="text-xs text-destructive">{state.error}</span>}`

### Grupo B — Acciones de ediciones con formulario público

**Archivo:** [`app/src/app/(app)/admin/ediciones/actions.ts`](../app/src/app/(app)/admin/ediciones/actions.ts) — `publicarFormularioAction`, `rotarFormularioAction`, `despublicarFormularioAction`

**Componente:** [`app/src/app/(app)/admin/ediciones/_components/publicar-formulario.tsx`](../app/src/app/(app)/admin/ediciones/_components/publicar-formulario.tsx) — ya es `"use client"` con `useState` propio. Usar `useTransition` + `useState<string | null>` para el error (más ergonómico dado que tiene múltiples acciones).

### Grupo C — Acciones de cierres

**Archivo:** [`app/src/app/(app)/caja/cierres/actions.ts`](../app/src/app/(app)/caja/cierres/actions.ts) — `bloquearCierreAction`, `desbloquearCierreAction`, `eliminarCierreAction`

Actualmente tienen try-catch silencioso (comentario en ~L123 lo reconoce). Aplicar mismo patrón: retornar `ActionResult`, quitar `console.error` silencioso.

**Componente:** `caja/cierres/_components/acciones-cierre.tsx` — cambiar a `useActionState` por cada botón.

### Grupo D — Acciones de nóminas

**Archivo:** [`app/src/app/(app)/caja/nominas/actions.ts`](../app/src/app/(app)/caja/nominas/actions.ts) — `marcarPagadaAction`, `desmarcarPagadaAction`

**Componente:** `caja/nominas/_components/acciones-nomina.tsx` — mismo patrón.

### Grupo E — Botón eliminar gasto

**Archivo:** [`app/src/app/(app)/caja/gastos/actions.ts`](../app/src/app/(app)/caja/gastos/actions.ts) — `eliminarGastoAction`

**Componente:** [`app/src/app/(app)/caja/gastos/_components/boton-eliminar.tsx`](../app/src/app/(app)/caja/gastos/_components/boton-eliminar.tsx) — ya es `"use client"`, cambiar a `useActionState`.

---

## Orden de ejecución

1. **Sidebar** (puntos 1 + 2 en una sola edición de `sidebar-nav.tsx` + editar `layout.tsx` y `admin/layout.tsx`)
2. **Copy San Isidro** (punto 3 — 11 strings en 10 archivos)
3. **Toggles simples** (Grupo A — empleados, proveedores, entidades, productos, ediciones toggle)
4. **Ediciones formulario** (Grupo B — publicar-formulario con useTransition)
5. **Cierres** (Grupo C)
6. **Nóminas** (Grupo D)
7. **Eliminar gasto** (Grupo E)

---

## Verificación

- **Punto 1**: `/admin` → Entidades aparece como tab. Sidebar no muestra Entidades.
- **Punto 2**: Navegar a `/admin/casetas` → solo "Administración" con estilo activo en sidebar.
- **Punto 3**: `grep -r "Feria\|El Rocío\|Hermandad" app/src` no devuelve resultados de UI (solo comentarios internos permitidos).
- **Punto 4**: Para cada toggle, abrir DevTools Network y confirmar que errores de servidor producen un `<span>` visible en la UI. Probar forzando un fallo con un ID inválido vía form manipulation.
