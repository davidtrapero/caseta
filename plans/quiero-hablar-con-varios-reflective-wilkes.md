# Lavado de cara visual — Glass Warm dual theme

## Context

La app está funcional y tiene base visual propia ("Cuero y Latón") pero el usuario la percibe **demasiado sobria** para gestionar casetas de feria — un dominio que admite (y agradece) más carácter visual sin perder rigor administrativo. El objetivo es modernizarla a estética 2026 manteniendo:

- Responsive actual (sidebar desktop + drawer mobile, breakpoints sm/md/lg).
- Densidad informativa de tablas y formularios — la app es back-office, no marketing.
- La paleta latón/oliva/granate que ya define la identidad.

**Dirección estética validada con mockups**: **Glass Warm Light** como tema por defecto + **toggle a Glass Warm Dark** para sesiones nocturnas en caseta. Glassmorphism templado sobre fondos cálidos con halos latón/oliva, tipografía actual (Bricolage + IBM Plex + JetBrains Mono) reforzada en su rol jerárquico, y micro-detalles materiales (grano sutil, glow en CTAs activos).

**Decisiones complementarias acordadas**:
- **Literales**: conciso y directo. Acortar verbos, eliminar prosa administrativa, mover descripciones largas a tooltips o subtítulos secundarios.
- **Motion**: refinar lo actual con CSS-only (sin framer-motion). Añadir transiciones cálidas en hover, glow pulse en CTAs.
- **Rollout**: por fases. Fase 1 = tokens + toggle + dashboard. Fase 2 = turnos + caja. Fase 3 = inventario + admin + auth.

Este plan cubre **Fase 1** y deja sentadas las bases (tokens, ThemeProvider, componentes UI migrados) para que las fases posteriores sean propagación, no rediseño.

---

## Arquitectura de tokens

Toda la decisión visual se concentra en [app/src/app/globals.css](app/src/app/globals.css), que ya usa `@theme inline` de Tailwind 4. Refactor: separar en dos bloques (`:root` y `[data-theme="dark"]`) con tokens duales.

### Tokens nuevos (añadir a globals.css)

```css
:root {
  /* Existentes (mantener nombres) */
  --background: hsl(39 34% 87%);
  --foreground: hsl(28 50% 12%);
  --primary: hsl(33 57% 50%);
  /* … */

  /* Nuevos — superficies glass */
  --surface-glass: linear-gradient(135deg, rgba(253,249,240,.7), rgba(240,231,211,.5));
  --surface-glass-strong: linear-gradient(135deg, rgba(253,249,240,.85), rgba(240,231,211,.65));
  --surface-glass-border: rgba(198,138,58,.25);
  --surface-glass-shadow: 0 1px 0 rgba(255,255,255,.6) inset, 0 8px 22px rgba(74,52,27,.06);

  /* Halos atmosféricos */
  --glow-warm: radial-gradient(circle at 12% 10%, #f4c97840 0%, transparent 38%);
  --glow-cool: radial-gradient(circle at 88% 90%, #5e704025 0%, transparent 42%);
  --glow-page: var(--glow-warm), var(--glow-cool),
               linear-gradient(160deg, #f0e7d3 0%, #e6dac2 60%, #d8c9a8 100%);

  /* Grano sutil */
  --grain: radial-gradient(circle at 1px 1px, rgba(74,52,27,.06) 1px, transparent 0);
  --grain-size: 18px 18px;
}

[data-theme="dark"] {
  --background: hsl(28 28% 11%);
  --foreground: hsl(39 30% 90%);
  --primary: hsl(36 60% 56%);
  /* … resto de overrides … */

  --surface-glass: linear-gradient(135deg, rgba(253,249,240,.05), rgba(244,201,120,.02));
  --surface-glass-strong: linear-gradient(135deg, rgba(253,249,240,.08), rgba(244,201,120,.04));
  --surface-glass-border: rgba(244,201,120,.18);
  --surface-glass-shadow: 0 1px 0 rgba(255,245,225,.08) inset, 0 12px 32px rgba(0,0,0,.22);

  --glow-warm: radial-gradient(circle at 12% 10%, #f4c97825 0%, transparent 42%);
  --glow-cool: radial-gradient(circle at 88% 90%, #b8d4a015 0%, transparent 45%);
  --glow-page: var(--glow-warm), var(--glow-cool),
               linear-gradient(160deg, #1a130a 0%, #2a1f12 50%, #3d2d1a 100%);
}
```

El `body` aplica `background: var(--glow-page)` + grano superpuesto vía `::before`.

---

## Theme toggle

Crear [app/src/components/theme-toggle.tsx](app/src/components/theme-toggle.tsx) y proveedor liviano sin librería externa. Patrón:

1. **Persistencia**: cookie `caseta-theme` (no localStorage — Server Components la leen). Lee en [app/src/app/layout.tsx](app/src/app/layout.tsx) vía `next/headers` y aplica `data-theme` al `<html>`. Sin flash inicial.
2. **Default**: `light`. Si cookie ausente, no aplicar atributo (cae a `:root`).
3. **Toggle**: server action en `app/src/app/actions/theme.ts` que setea la cookie. El componente cliente usa `useTransition` + `revalidatePath('/')` o `router.refresh()` para repintar.
4. **Ubicación visual**: en el header del shell, junto al user info. Icono Lucide `Sun`/`Moon` con transición suave.

---

## Componentes UI base (afectados)

Migrar para usar tokens nuevos (no cambia API, solo styles):

| Componente | Cambio |
|---|---|
| [app/src/components/ui/card.tsx](app/src/components/ui/card.tsx) | Variant `glass` (default) → `background: var(--surface-glass)`, `backdrop-filter: blur(14px)`, `border: 1px solid var(--surface-glass-border)`, `box-shadow: var(--surface-glass-shadow)` |
| [app/src/components/ui/button.tsx](app/src/components/ui/button.tsx) | Variant `default` con gradient latón + glow shadow + inner highlight. Hover: leve scale + glow más intenso. |
| [app/src/components/ui/table.tsx](app/src/components/ui/table.tsx) | Wrapper glass. Header con `bg: rgba(198,138,58,.08)` + label uppercase 10px latón. Filas zebra muy ligeras (`rgba(255,255,255,.18)` en light, `rgba(255,245,225,.025)` en dark). |
| [app/src/components/ui/badge.tsx](app/src/components/ui/badge.tsx) | Tres variantes pill semánticas: `success` (oliva), `warning` (latón), `danger` (granate). Borde + bg translúcido. |
| [app/src/components/ui/input.tsx](app/src/components/ui/input.tsx) | Background semitranslúcido + borde latón sutil + radius 999px en variant `pill` (para search/filtros). |

Mockup HTML de referencia: `.superpowers/brainstorm/886-1778420438/content/glass-light.html` y `glass-medium.html`.

---

## Layout / shell

[app/src/app/(app)/layout.tsx](app/src/app/(app)/layout.tsx) — cambios:

1. **Body con halos**: aplicar `--glow-page` como background + `::before` con grano.
2. **Header**: añadir `ThemeToggle` a la derecha del bloque user info. Mantener brand y EdicionBanner.
3. **Sidebar**: glass strong (`--surface-glass-strong`) en desktop. Mobile drawer sin cambios estructurales — solo estilos.
4. **Main**: `p-6 md:p-8` se mantiene.

---

## Dashboard (página piloto Fase 1)

[app/src/app/(app)/page.tsx](app/src/app/(app)/page.tsx) — refactor visual sin tocar lógica:

- **KPI strip**: 4 cards glass uniformes. Label uppercase 10px latón, número JetBrains Mono 24px, delta 11px (oliva up / granate down con flechas ↑↓).
- **Paneles operativos** (cobertura turnos, voluntarios, pedidos): cada uno en glass card. Progress bars con gradient latón en lugar de barras planas.
- **Actividad reciente**: lista con tipografía monoespaciada para timestamps, líneas separadoras finas latón.
- **Empty states**: "No hay edición activa · Activa una edición desde Admin para ver el dashboard" → versión concisa: **"Sin edición activa"** + botón secundario "Ir a administración" en lugar de párrafo.

### Literales del dashboard a actualizar (Fase 1)

| Antes | Después |
|---|---|
| "No hay edición activa · Activa una edición en Administración para ver el dashboard" | "Sin edición activa" + CTA "Ir a administración" |
| "Ingresos hoy" / "Gastos edición" / "Resultado neto" | "Ingresos · hoy" / "Gastos · edición" / "Neto" |
| Subtítulos descriptivos largos en cada panel | Mover a `title` attribute (tooltip) o eliminar si redundante |

Las literales del resto de páginas se actualizan en sus fases respectivas, con la misma regla: **acortar, mover prosa a tooltips, conservar mensajes de error tal cual** (esos ya son funcionales).

---

## Motion (CSS-only)

Añadir a globals.css:

```css
@keyframes caseta-glow-pulse {
  0%, 100% { box-shadow: 0 4px 14px rgba(198,138,58,.32); }
  50%      { box-shadow: 0 4px 22px rgba(198,138,58,.5); }
}

.caseta-cta-active { animation: caseta-glow-pulse 2.4s ease-in-out infinite; }

/* Hover cálido en cards/chips clickables */
.caseta-card-hover {
  transition: transform .18s ease-out, box-shadow .22s ease-out, border-color .22s ease-out;
}
.caseta-card-hover:hover {
  transform: translateY(-1px);
  border-color: rgba(198,138,58,.45);
}
```

Mantener `caseta-fade-in` y `caseta-stagger` ya existentes. **No** se introduce framer-motion.

---

## Archivos críticos a modificar (Fase 1)

| Archivo | Cambio |
|---|---|
| [app/src/app/globals.css](app/src/app/globals.css) | Tokens duales, halos, grano, motion CSS |
| [app/src/app/layout.tsx](app/src/app/layout.tsx) | Lectura de cookie `caseta-theme` y aplicación de `data-theme` al `<html>` |
| [app/src/app/(app)/layout.tsx](app/src/app/(app)/layout.tsx) | Halos en body, ThemeToggle en header, sidebar glass |
| [app/src/app/(app)/page.tsx](app/src/app/(app)/page.tsx) | Dashboard repintado + literales actualizados |
| [app/src/components/theme-toggle.tsx](app/src/components/theme-toggle.tsx) | **Nuevo** — botón + server action |
| [app/src/app/actions/theme.ts](app/src/app/actions/theme.ts) | **Nuevo** — server action que setea cookie |
| [app/src/components/ui/card.tsx](app/src/components/ui/card.tsx) | Variant `glass` |
| [app/src/components/ui/button.tsx](app/src/components/ui/button.tsx) | Gradient + glow en variant default |
| [app/src/components/ui/table.tsx](app/src/components/ui/table.tsx) | Wrapper glass + zebra ligero |
| [app/src/components/ui/badge.tsx](app/src/components/ui/badge.tsx) | Variantes semánticas pill |
| [app/src/components/ui/input.tsx](app/src/components/ui/input.tsx) | Variant `pill` translúcido |

**No tocar en Fase 1**: rutas de turnos, caja, inventario, admin, apuntarse, login. Como usan los componentes UI base, su look mejora automáticamente, pero refinamientos por página vienen en Fases 2-3.

---

## Reutilización del código existente

- `cn()` helper en [app/src/lib/utils.ts](app/src/lib/utils.ts) ya está, se reutiliza en variantes nuevas.
- CVA ya está integrado en Button — extender variantes, no reemplazar.
- Animaciones CSS `caseta-fade-in` / `caseta-stagger` en globals.css se mantienen y reutilizan.
- Lucide React (Sun, Moon) ya como dependencia — no hay que añadir nada.

---

## Verificación end-to-end

1. **Light mode**:
   - `npm run dev` desde `app/`
   - Abrir http://localhost:3000 en navegador
   - Verificar: halos visibles, cards glass legibles, KPIs con tipografía correcta, hover en chips/cards funciona suave.
2. **Toggle a dark**:
   - Click en ThemeToggle del header
   - Verificar que cambia sin flash, persiste tras recargar (cookie funciona)
   - Tablas legibles en dark, glass templado, sin texto bajo de contraste.
3. **Responsive**:
   - DevTools mobile (375px): sidebar oculto, drawer abre con hamburguesa, KPIs en 2 columnas, tablas con scroll horizontal limpio.
   - Tablet (768px): KPIs 4 columnas, sidebar visible.
4. **Sin regresiones funcionales**: navegar a /turnos, /caja, /admin — deben funcionar igual con look mejorado.
5. **Build**: `npm run build` debe pasar (TS strict + prerender de rutas estáticas).
6. **Lint**: `npm run lint` sin warnings nuevos.

---

## Fases siguientes (fuera de este plan)

- **Fase 2**: ✅ COMPLETA — turnos + caja migrados a glass warm, literales actualizados.
- **Fase 3**: ✅ COMPLETA — inventario, admin, login, apuntarse migrados.
- **Fase 4**: módulo `/empleados` — ver sección abajo.

---

## Fase 4 — Módulo Empleados

### Context

Tras completar Fases 2 y 3, el único módulo visible en navegación normal con `bg-card` antiguo es `/empleados`. El componente `EmpleadoCard` usa `rounded-lg border border-border/70 bg-card/60 shadow-sm` mientras el resto de la app usa glass warm tokens. La página de empleados es de uso frecuente (admin y gerente la visitan para asignar turnos).

---

### Archivos críticos a modificar

| Archivo | Cambio |
|---|---|
| [`app/src/app/(app)/empleados/_components/empleado-card.tsx`](app/src/app/(app)/empleados/_components/empleado-card.tsx) | Migrar `<article>` a glass warm tokens |
| [`app/src/app/(app)/empleados/page.tsx`](app/src/app/(app)/empleados/page.tsx) | Acortar subtitle de `SectionHeader` |

---

### Cambios detallados

#### `empleado-card.tsx`

**`<article>` wrapper** (línea 55):
```diff
- className="rounded-lg border border-border/70 bg-card/60 p-4 shadow-sm transition-opacity"
+ className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4 transition-opacity"
+ style={{ opacity: empleado.activo ? 1 : 0.7, boxShadow: "var(--surface-glass-shadow)" }}
```
(mover el `opacity` inline al mismo objeto `style` que `boxShadow`)

**Lista de turnos** — el `<ul>` usa `border-l border-border/60`:
```diff
- className="mt-2 space-y-1 border-l border-border/60 pl-3"
+ className="mt-2 space-y-1 border-l border-[var(--surface-glass-border)] pl-3"
```

**`<details>` summary** — mantener igual (no es una surface).

#### `empleados/page.tsx`

**`SectionHeader subtitle`**:
```diff
- subtitle="Personal disponible para turnos. Los voluntarios no cobran jornal."
+ subtitle="Personal disponible para turnos."
```

---

### Patrón de referencia

Mismos tokens ya usados en `BloqueTurno.tsx`, `turnos-hoy.tsx` y `actividad-feed.tsx`:
- `rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md`
- `style={{ boxShadow: "var(--surface-glass-shadow)" }}`

---

### Verificación

1. `npm run build` desde `app/` — debe pasar sin errores
2. Navegar a `/empleados` en light y dark mode — cards con glass, opacidad de inactivos visible
3. Verificar que el toggle de activo/inactivo (`ToggleActivoEmpleadoForm`) no queda recortado por el stacking context del `backdrop-blur-md` (Radix usa portales, debería estar ok)
4. Commit: `feat(empleados): migra EmpleadoCard a glass warm tokens`

---

### Nota: fuera de scope en Fase 4

- `empleados/[id]/page.tsx` y `empleado-form.tsx` usan `FormShell` de page-header — ya hereda glass desde Fase 3.
- `TurnosAsignadosEmpleado.tsx` — componente de detalle, no visible en flujo principal.
- `empleados-filters.tsx` — barra de filtros, no es una surface card.

---

## Bug pendiente — arreglar ANTES de empezar Fase 2

**Síntoma reportado al probar el toggle de tema en `npm run dev`:**

```
Runtime ReferenceError: Theme is not defined
  at module evaluation .../actions.js (server actions loader)
  at SidebarNav (sidebar-nav.tsx:105)
  at AppLayout (layout.tsx:41)

Code frame:
> 1 | export {setTheme as '4008e6ffa00054f...
```

**Causa raíz:** en [app/src/app/actions/theme.ts](app/src/app/actions/theme.ts), un archivo marcado con `"use server"`, se introdujo `export type { Theme };` durante el refactor del code review de T2 (commit `c8dc3c9`).

Next.js 16 con Turbopack solo permite **async functions** como exports en archivos con `"use server"`. El `import type` se borra en runtime (type-only), pero el `export { Theme }` queda como referencia a un identificador inexistente → `ReferenceError`.

**Fix mínimo (una línea):** eliminar `export type { Theme };` de `actions/theme.ts`.

**Consumidores a actualizar tras el fix:**
- [app/src/components/theme-toggle.tsx](app/src/components/theme-toggle.tsx) importa `Theme` desde `@/app/actions/theme` — cambiar a `@/lib/theme` (donde sí vive el tipo).

**Cambio concreto a aplicar:**

```diff
// app/src/app/actions/theme.ts
 "use server";

 import { cookies } from "next/headers";
 import { revalidatePath } from "next/cache";
-import type { Theme } from "@/lib/theme";
-
-export type { Theme };
+import type { Theme } from "@/lib/theme";

 export async function setTheme(theme: Theme) {
   ...
 }
```

```diff
// app/src/components/theme-toggle.tsx
-import { setTheme, type Theme } from "@/app/actions/theme";
+import { setTheme } from "@/app/actions/theme";
+import type { Theme } from "@/lib/theme";
```

**Verificación tras el fix:**
1. `npm run dev` desde `app/`.
2. Abrir http://localhost:3000, hacer login.
3. Click en el icono Moon del sidebar — el tema debe cambiar a oscuro sin error.
4. Recargar — debe persistir.
5. Click en Sun — vuelve a claro.
6. `npm run build` debe seguir pasando.

**Lección para futuros code reviews**: nunca añadir re-exports de tipos en archivos `"use server"`. Los tipos se importan desde el módulo que los define (`@/lib/theme`), nunca desde la action file.
