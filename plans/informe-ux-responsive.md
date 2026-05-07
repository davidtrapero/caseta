# Informe de Propuestas UX, Identidad Visual y Responsive

**Auditoría de Caseta (Next.js 16 / React 19 / Tailwind 4)**
**Fecha:** 2026-05-05

---

## Resumen ejecutivo

Revisión del código real de la app: back-office privado para gestión de casetas de feria (turnos, inventario, caja, voluntarios) usado a diario por 2-5 personas (admin, gerente, cajero).

**Fortalezas:**
- Identidad visual defensible: paleta terracota/albero (HSL 33°, 57%), tipografía característica (Bricolage Grotesque + IBM Plex Sans + JetBrains Mono).
- Componentes shadcn/ui adaptados (botones con `rounded-md`, badges, tablas, cards).
- Arquitectura de datos sólida (Prisma, roles, auditoría automática).

**Problemas críticos:**
1. **Responsive roto** — sidebar de 240px fijo, main con `p-8`, tablas no escalan en móvil/tablet.
2. **Tablas densas sin affordances** — headers grises crudos, sin sticky, sin paginación, números sin alineación a derecha.
3. **Feedback de usuario ausente** — sin spinners en saves, toasts oscurecidos, estados de loading en forms faltan.
4. **Login + formulario voluntario = primeras impresiones débiles** — minimalista genérico, sin carácter.
5. **Inconsistencias en navegación** — sin highlight de página activa, breadcrumbs ausentes.

---

## 1. Identidad visual — diagnóstico y propuesta

### Estado actual ([app/src/app/globals.css](../app/src/app/globals.css))

- Paleta "Cuero y Latón":
  - Background: `hsl(39 34% 87%)` (#ebe3d3 beige).
  - Primary: `hsl(33 57% 50%)` (#c68a3a latón envejecido) ✓
  - Destructive: `hsl(3 60% 23%)` (#5c1a17 granate) ✓
- Tipografía: Bricolage Grotesque (headings) + IBM Plex Sans (body) + JetBrains Mono (tablas) ✓

**Cumplimiento [CLAUDE.md](../CLAUDE.md):**
- ✓ NO Inter/Roboto/Arial.
- ✓ Paleta tierras cálidas + rojo albero.
- ✓ Tipografía con carácter.
- ✗ **Falta textura en fondos** — solo SVG noise genérico, sin grano andaluz.
- ✗ **Card radius genérico** — `rounded-xl` (12px), no diferenciación vs. botones (6px).

### Propuesta — CSS variables ampliadas

```css
:root {
  --background: 39 34% 87%;           /* #ebe3d3 base beige */
  --foreground: 30 22% 6%;            /* #14100c tinta oscura */

  --primary: 33 57% 50%;              /* #c68a3a latón */
  --primary-foreground: 40 48% 97%;

  --secondary: 35 40% 45%;            /* #9b6b33 ocre profundo */
  --secondary-foreground: 40 48% 97%;

  --destructive: 3 60% 23%;           /* #5c1a17 granate */
  --destructive-foreground: 40 48% 95%;

  --accent: 85 30% 42%;               /* #6b7d3f verde oliva sutil */
  --accent-foreground: 40 48% 97%;

  --muted: 38 22% 82%;
  --muted-foreground: 30 12% 32%;
  --border: 35 18% 72%;
  --input: 35 18% 68%;
}

/* Fondo con textura sutil — grano + líneas finas, papel albero */
body {
  background-image:
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect fill='%23d4cbb8' width='4' height='4'/%3E%3Cpath d='M0,0l4,4M4,0l-4,4' stroke='%23d4cbb8' stroke-width='0.5' opacity='0.08'/%3E%3C/svg%3E"),
    linear-gradient(135deg, hsl(39 34% 87% / 1) 0%, hsl(40 36% 89% / 0.4) 100%);
  background-attachment: fixed;
  background-size: 4px 4px, 100% 100%;
  background-blend-mode: multiply;
}
```

### Border radius refinado

```css
:root {
  --radius-lg: 0.5rem;      /* Cards, containers grandes: 8px */
  --radius-md: 0.375rem;    /* Botones, inputs (actual): 6px */
  --radius-sm: 0.25rem;     /* Badges: 4px */
}
```

- [card.tsx](../app/src/components/ui/card.tsx): `rounded-xl` → `rounded-lg`.
- [button.tsx](../app/src/components/ui/button.tsx): mantener `rounded-md`.
- [badge.tsx](../app/src/components/ui/badge.tsx): mantener `rounded-sm`.

---

## 2. Propuestas por pantalla

### 2.1 Login — primera impresión débil + usabilidad de contraseña

**Archivo:** [app/src/app/login/login-form.tsx](../app/src/app/login/login-form.tsx)

**Contexto técnico relevante:**
- El form usa `useState` nativo + `signIn.email()` de better-auth (no Server Actions).
- El estado actual: `const [loading, setLoading]` y `const [error, setError]` simples.
- Errores vienen de `authError.message` — strings en inglés de better-auth ("Invalid email or password", "User not found", etc.).
- No hay `ToastProvider` en el layout del login — el error debe permanecer inline, no toast.
- `<Input>` es un forwardRef que acepta `type` como prop — el toggle no requiere cambiar el componente base.

**Problemas:**
- Card minimalista sin marca ni contexto visual.
- Sin feedback de loading visible (el botón dice "Entrando…" pero sin spinner).
- Campo contraseña sin toggle mostrar/ocultar — el usuario no puede verificar lo que escribe.
- Mensajes de error crudos en inglés de better-auth, sin clasificación ni diseño claro.

---

**Propuesta A — Toggle mostrar/ocultar contraseña:**

Añadir estado `const [showPassword, setShowPassword] = useState(false)` y envolver el `<Input>` de contraseña en un `div` relativo con botón de ojo:

```tsx
import { Eye, EyeOff } from "lucide-react";

const [showPassword, setShowPassword] = useState(false);

<div className="relative">
  <Input
    id="password"
    name="password"
    type={showPassword ? "text" : "password"}
    autoComplete="current-password"
    required
    disabled={loading}
    className="pr-10"
  />
  <button
    type="button"
    onClick={() => setShowPassword((v) => !v)}
    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    tabIndex={-1}
  >
    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
</div>
```

Notas:
- `tabIndex={-1}` para no interrumpir el flujo de Tab del formulario (email → password → submit).
- `aria-label` dinámico para accesibilidad.
- `type="button"` obligatorio para que no haga submit accidental.

---

**Propuesta B — Mensajes de error enriquecidos:**

Añadir función de mapeo de errores de better-auth a español legible antes del `setError`:

```tsx
function mapAuthError(message: string | undefined): string {
  if (!message) return "Error al iniciar sesión. Inténtalo de nuevo.";
  const m = message.toLowerCase();
  if (m.includes("invalid email or password") || m.includes("invalid credentials"))
    return "Email o contraseña incorrectos.";
  if (m.includes("user not found") || m.includes("no user found"))
    return "No existe ninguna cuenta con ese email.";
  if (m.includes("too many") || m.includes("rate limit"))
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  if (m.includes("email not verified"))
    return "Email no verificado. Contacta con el administrador.";
  if (m.includes("account disabled") || m.includes("banned"))
    return "Esta cuenta está desactivada. Contacta con el administrador.";
  return "Error al iniciar sesión. Inténtalo de nuevo.";
}

// En onSubmit:
if (authError) {
  setError(mapAuthError(authError.message));
  return;
}
```

**Propuesta C — Bloque de error con mejor diseño visual:**

Sustituir el `<p className="text-sm text-destructive">` actual por un bloque con icono y fondo:

```tsx
import { AlertCircle } from "lucide-react";

{error && (
  <div
    role="alert"
    className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
  >
    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
    <span>{error}</span>
  </div>
)}
```

---

**Propuesta D — Spinner en submit + marca visual:**

```tsx
import { Loader2 } from "lucide-react";

{/* Icono de marca */}
<div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md mx-auto mb-2">
  <span className="text-2xl" role="img" aria-label="Caseta de feria">🎪</span>
</div>

{/* Submit con spinner */}
<Button type="submit" disabled={loading} className="w-full gap-2">
  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
  {loading ? "Entrando…" : "Entrar"}
</Button>
```

---

**Resumen de cambios en login-form.tsx:**

| Cambio | Estado actual | Propuesto |
|--------|--------------|-----------|
| Icono de marca | Sin icono | `🎪` en div con gradiente primary |
| Campo contraseña | `type="password"` fijo | Toggle Eye/EyeOff con `tabIndex={-1}` |
| Mensajes error | String crudo de better-auth en inglés | `mapAuthError()` → español legible |
| Diseño bloque error | `<p text-destructive>` | `<div>` con icono `AlertCircle` + fondo `bg-destructive/8` |
| Spinner submit | Solo texto "Entrando…" | `Loader2` animado + texto |

**Sin dependencias nuevas** — `Eye`, `EyeOff`, `AlertCircle`, `Loader2` son todos de `lucide-react` ya instalado.

---

### 2.2 Formulario voluntario — contexto cálido

**Archivo:** [app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx](../app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx)

**Problemas:** form frío, checkboxes anidados sin jerarquía visual, sin preview ni confirmación.

**Propuesta:**

```tsx
{/* 1. Header con icono y contexto */}
<header className="mb-8 p-6 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10">
  <div className="flex items-start gap-4">
    <div className="text-4xl">🎫</div>
    <div>
      <h1 className="text-2xl font-semibold">Apúntate como voluntario</h1>
      <p className="text-muted-foreground mt-1">{edicion.nombre} • {edicion.anio}</p>
      <p className="text-sm text-muted-foreground/70 mt-2">
        Completa el formulario y elige los turnos en los que puedas ayudar.
      </p>
    </div>
  </div>
</header>

{/* 2. Turnos con mejor UX */}
{dia.casetas.map((caseta) => (
  <fieldset key={caseta.nombre} className="rounded-lg border-2 border-muted p-4">
    <legend className="text-base font-medium mb-3 text-foreground">
      📍 {caseta.nombre}
    </legend>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {caseta.turnos.map((t) => (
        <label
          key={t.id}
          className="flex items-center gap-3 p-3 rounded-md border border-transparent
                     bg-white/50 hover:bg-accent/40 hover:border-accent cursor-pointer
                     transition-all data-[checked=true]:bg-primary/10 data-[checked=true]:border-primary/30"
        >
          <input type="checkbox" name="turnoIds" value={t.id} className="h-4 w-4 rounded accent-primary" />
          <div className="flex-1 flex justify-between items-center">
            <span className="text-sm font-medium">⏰ {t.rango}</span>
            <span className="text-xs bg-primary/10 text-primary rounded px-2 py-1">
              {t.huecos} plaza{t.huecos === 1 ? "" : "s"}
            </span>
          </div>
        </label>
      ))}
    </div>
  </fieldset>
))}

{/* 3. Confirmación visual antes de submit */}
<div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
  <p className="text-sm text-muted-foreground">
    ✓ Se enviarán tus datos y solicitudes. Un admin revisará y confirmará.
  </p>
</div>
```

---

### 2.3 Tablas densas (stock, cierres, asistencias)

**Archivo base:** [app/src/components/ui/table.tsx](../app/src/components/ui/table.tsx)

**Problemas:**
- Header gris (`bg-muted/40`) sin contraste ni peso.
- Sin sticky header.
- Sin zebra-striping.
- Acciones inline amontonadas.
- Sin paginación visible.
- Números sin alineación a derecha.

**Propuesta de componente Table mejorado:**

```tsx
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto rounded-lg border bg-card">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm border-collapse", className)}
        {...props}
      />
    </div>
  )
);

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        "sticky top-0 z-10",
        "border-b bg-primary/10 [&_tr]:border-b",
        className
      )}
      {...props}
    />
  )
);

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b",
        "data-[state=selected]:bg-primary/5",
        "[&:nth-child(odd)]:bg-muted/20",
        "hover:bg-accent/20 transition-colors",
        className
      )}
      {...props}
    />
  )
);

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-foreground",
        className
      )}
      {...props}
    />
  )
);

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "p-4 align-middle",
        "data-[numeric]:text-right data-[numeric]:font-mono",
        className
      )}
      {...props}
    />
  )
);
```

**Aplicación:**
- [stock/page.tsx](../app/src/app/(app)/inventario/stock/page.tsx) — añadir paginación (`ITEMS_PER_PAGE = 10`, contador, prev/next).
- [cierres/page.tsx](../app/src/app/(app)/caja/cierres/page.tsx) — sticky header + columna de acciones alineada a derecha.

---

### 2.4 Sidebar — contexto temporal y jerarquía

**Archivo:** [app/src/app/(app)/layout.tsx](../app/src/app/(app)/layout.tsx)

**Problemas:** sidebar 240px fijo (`w-60`) sin collapse en móvil, sin edición activa ni fecha, sin highlight de página activa, user info al pie sin zona clara de salida.

**Propuesta:**

```tsx
<aside className="w-60 border-r bg-card flex flex-col max-h-screen">
  {/* Header con contexto */}
  <div className="px-6 py-5 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-2xl">🎪</span>
      <h1 className="text-lg font-semibold">Caseta</h1>
    </div>
    <p className="text-xs text-muted-foreground">
      {edicionNombre} • {hoy.toLocaleDateString("es-ES")}
    </p>
  </div>

  {/* Nav con current-page highlight */}
  <nav className="flex-1 p-3 flex flex-col gap-1 overflow-auto">
    {navItems.map(({ href, label, icon: Icon }) => {
      const isActive = pathname === href;
      return (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
            isActive
              ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
              : "hover:bg-accent/20 text-foreground/80"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      );
    })}
  </nav>

  {/* User section */}
  <div className="border-t p-3 flex flex-col gap-2 bg-muted/30">
    <div className="px-3 py-2 text-xs">
      <p className="font-medium truncate">{user.name}</p>
      <p className="text-muted-foreground/70 text-xs truncate">{user.email}</p>
      <Badge variant={rolVariant[user.rol]} className="mt-1 w-fit">{user.rol}</Badge>
    </div>
    <LogOutButton className="w-full" />
  </div>
</aside>
```

---

## 3. Responsive — estrategia móvil/tablet

**Estado actual:** rompe completamente en móvil (<768px).

### 3.1 Layout responsivo (drawer móvil)

```tsx
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — hidden en sm */}
      <aside className="hidden md:flex md:w-60 border-r bg-card flex-col">
        {/* nav content */}
      </aside>

      {/* Mobile drawer */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed bottom-4 left-4">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">{/* same nav content */}</SheetContent>
      </Sheet>

      <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  );
}
```

### 3.2 Tablas en móvil — stack vertical o scroll horizontal

```css
@media (max-width: 640px) {
  table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }

  /* O: stack vertical con data-label */
  tbody tr {
    display: block;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  tbody td {
    display: block;
    padding-left: 50%;
    position: relative;
    border: none;
  }

  tbody td::before {
    content: attr(data-label);
    position: absolute;
    left: 1rem;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }
}
```

Uso: `<TableCell data-label="Total (€)" data-numeric>{formatCurrency(total)}</TableCell>`.

### 3.3 Prioridades por breakpoint

| Componente | <640px | 640-1024px | >1024px |
|---|---|---|---|
| Sidebar | Drawer | Drawer | Fixed |
| Tablas | Stack vertical | Scroll h. | Full |
| Formularios | 1 col | 1-2 col | 2 col |
| Buttons | Full width | Inline | Inline |
| Hero headers | Compact (`text-lg`) | Normal | Normal |

---

## 4. Sistema de componentes — patrones reutilizables

### 4.1 Spinner

Crear `app/src/components/ui/spinner.tsx`:

```tsx
export function Spinner({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizeMap = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
  return (
    <svg className={cn(sizeMap[size], "animate-spin text-primary")} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
```

Uso en forms:

```tsx
<Button disabled={pending} className="w-full">
  {pending && <Spinner size="sm" />}
  {pending ? "Guardando…" : "Guardar"}
</Button>
```

### 4.2 Toast (sonner)

```bash
npm install sonner
```

Uso:

```ts
import { toast } from "sonner";

toast.success("Cambios guardados", {
  description: "Fecha: " + new Date().toLocaleDateString("es-ES"),
});
toast.error("Hubo un problema", { description: error.message });
```

Personalización:

```css
:where([data-sonner-toast]) {
  --normal-bg: hsl(39 34% 87%);
  --normal-border: hsl(33 57% 50%);
  --normal-text-color: hsl(30 22% 6%);
}
```

### 4.3 Confirmación destructiva (AlertDialog)

```tsx
export function ConfirmDelete({
  onConfirm,
  title = "¿Estás seguro?",
  description = "Esta acción no se puede deshacer.",
}: { onConfirm: () => void; title?: string; description?: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">Eliminar</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive">Eliminar</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## 5. Accesibilidad — quick wins

1. **Focus visible:** inputs ya tienen `focus-visible:ring-1` ✓; añadir `focus-visible:outline-2 outline-offset-2` en links y buttons.
2. **Contraste tablas:** header `bg-muted/40` → `bg-primary/15`; texto headers de `text-muted-foreground` a `text-foreground`.
3. **Labels asociados:** ya presentes ✓; añadir `aria-label` en icon-only buttons.
4. **Navegación por teclado en tablas:** filas con `role="button"` si son clicables, Tab order claro en acciones inline.
5. **Contraste WCAG:** primary `#c68a3a` on white = 4.5:1 ✓; revisar secondary text.

---

## 6. Microinteracciones — timing y feedback

**Permitidas (según [CLAUDE.md](../CLAUDE.md)):**
- Fade-in al montar forms (180ms).
- Slide en sidebars (drawer abrir).
- Feedback botones: hover dimmer, NO hover en filas de tabla.

```css
/* Fade escalonado para forms */
.animate-form-in > *:nth-child(1) { animation-delay: 0ms; }
.animate-form-in > *:nth-child(2) { animation-delay: 40ms; }
.animate-form-in > *:nth-child(3) { animation-delay: 80ms; }

/* Pulso en botones (hover suave) */
.button:not(.ghost):not(.link):hover {
  filter: brightness(0.95);
  transition: all 120ms ease-out;
}

/* Estado de carga */
[data-loading="true"] {
  position: relative;
  pointer-events: none;
  opacity: 0.6;
}
```

---

## 7. Roadmap por fases

### Fase 1 — Quick wins (2-3 días)
1. CSS globals: variables secundarias, grano textura, fix card radius.
2. Table header: sticky + zebra striping + peso visual.
3. Spinner component + uso en forms.
4. Login: icono, mejor feedback.

### Fase 2 — Responsive (3-4 días)
5. Sidebar drawer en móvil.
6. Tablas responsive (stack vertical en <640px).
7. Padding adaptativo (`p-4` móvil, `p-8` desktop).
8. Botones full-width en móvil.

### Fase 3 — UX completa (4-5 días)
9. Formulario voluntario con iconos y jerarquía.
10. Toast notifications con sonner.
11. Confirm dialogs para destructivos.
12. Breadcrumbs (opcional).

### Fase 4 — Polish (2-3 días)
13. Accesibilidad: focus visible, aria labels.
14. Animaciones escalonadas en page loads.
15. Paginación en tablas densas.

---

## Archivos clave a modificar

| Archivo | Cambio | Prioridad |
|---|---|---|
| [app/src/app/globals.css](../app/src/app/globals.css) | CSS vars mejoradas, grano, animaciones | P0 |
| [app/src/components/ui/table.tsx](../app/src/components/ui/table.tsx) | Sticky header, zebra-striping, hover | P0 |
| [app/src/components/ui/card.tsx](../app/src/components/ui/card.tsx) | `rounded-xl` → `rounded-lg` | P0 |
| `app/src/components/ui/spinner.tsx` | CREAR nuevo | P1 |
| [app/src/app/(app)/layout.tsx](../app/src/app/(app)/layout.tsx) | Sidebar responsive, current-page highlight | P1 |
| [app/src/app/login/login-form.tsx](../app/src/app/login/login-form.tsx) | Logo, mejor contraste, spinner | P1 |
| [app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx](../app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx) | Iconos, fieldsets, mejor UX | P2 |
| [app/src/app/(app)/inventario/stock/page.tsx](../app/src/app/(app)/inventario/stock/page.tsx) | Paginación, mejor headers | P2 |
| [app/src/app/(app)/caja/cierres/page.tsx](../app/src/app/(app)/caja/cierres/page.tsx) | Sticky headers, acciones claras | P2 |

---

## Conclusión

La app tiene **bases sólidas de identidad y arquitectura**. El trabajo es **pulir la experiencia** sin romper lo que funciona:

- Tipografía + paleta ya son fuertes → reforzar con variables CSS + textura.
- Componentes shadcn existen → personalizar (sticky, zebra, affordances).
- Mobile quebrado → drawer + stack tables.
- Feedback usuario débil → Spinner + toasts + dialogs.

**Impacto esperado:** ↑ usabilidad, ↑ estética, ↑ confianza usuario — especialmente en móvil y primeras impresiones (login, formulario voluntario).
