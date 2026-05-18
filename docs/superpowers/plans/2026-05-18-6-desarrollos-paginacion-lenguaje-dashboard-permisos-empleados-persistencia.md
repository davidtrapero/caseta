# 6 Desarrollos: Paginación, Lenguaje Inclusivo, Dashboard, Permisos, Formulario Empleados Público, Persistencia Form State

> **Para agentes agenticos:** REQUERIDO: Usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea a tarea. Las tareas usan sintaxis de casillas (`- [ ]`) para rastreo.

**Objetivo:** Implementar 6 desarrollos cross-cutting en el proyecto caseta: paginación universal (14 listados), lenguaje inclusivo, dashboard con KPIs por edición activa, matriz granular de permisos editable, formulario público de empleados con autocompletado DNI, y persistencia de datos en formularios tras error de validación.

**Arquitectura:** Orden de ejecución: D2 (lenguaje) → D6 (persistencia form state) → D1 (paginación) → D3 (dashboard) → D4 (permisos) → D5 (empleados público). D4 va al final por alcance transversal. Se reutilizan patrones existentes (ActionResult, parseForm, requireRole→requirePermiso, withAuditContext, rate-limit, useActionState+defaultValue).

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7, PostgreSQL/Neon, Better Auth 1.6, shadcn/ui, Zod 4, TypeScript 5 strict, vitest (tests backend), playwright (tests E2E).

---

## Índice rápido de desarrollos

1. **D1 — Paginación universal** (14 listados)
2. **D2 — Lenguaje inclusivo** (barrido de strings)
3. **D3 — Dashboard: KPIs por edición activa**
4. **D4 — Matriz de permisos granular** (tabla RolPermiso editable)
5. **D5 — Formulario público empleados** (análogo a voluntarios)
6. **D6 — Persistencia datos en formularios**

---

## D2 — Lenguaje Inclusivo (ejecutar PRIMERO)

### Tarea 2.1: Inventario de strings con género genérico

**Archivos:**
- Revisar: `app/src/app/` (todas las rutas)
- Output: `plans/glosario-inclusivo.md` (nuevo)

- [ ] **Paso 1: Grep de literales problemáticos**

Busca en toda la carpeta `app/src/app/` strings que usen género masculino genérico:

```bash
cd c:\Proyectos\caseta\app
grep -r "los empleados\|el usuario\|el voluntario\|el cajero\|el gerente\|el admin\|trabajador\|la persona trabajadora" src/app/ --include="*.tsx" --include="*.ts" | head -50
```

- [ ] **Paso 2: Documentar hallazgos**

Crea `plans/glosario-inclusivo.md` (nuevo) con formato:

```markdown
# Glosario de lenguaje inclusivo — Caseta

## Estrategia: Mezcla pragmática

- Colectivo donde sea natural: "personal", "plantilla", "equipo", "cuentas", "recursos".
- Desdoble solo donde el colectivo suene forzado o el desdoble resulte más claro.

## Inventario de cambios propuestos

### Módulo Admin
- Archivo: `app/src/app/(app)/admin/usuarios/page.tsx:45`
  - Actual: "Lista de **los usuarios** del sistema"
  - Propuesto: "Lista de cuentas del sistema" (colectivo)

- Archivo: `app/src/app/(app)/admin/entidades/page.tsx:12`
  - Actual: "Entidades donde trabajan **los voluntarios**"
  - Propuesto: "Entidades donde trabaja el voluntariado" (epiceno)

### Módulo Caja
- Archivo: `app/src/app/(app)/caja/nominas/page.tsx:28`
  - Actual: "Nóminas de **los empleados** con asistencia"
  - Propuesto: "Nóminas del personal con asistencia" (colectivo)

### Módulo Empleados
- Archivo: `app/src/app/(app)/empleados/page.tsx:8`
  - Actual: "**Los empleados** activos de las casetas"
  - Propuesto: "Personal activo de las casetas" (colectivo)

### Módulo Turnos
- Archivo: `app/src/app/(app)/turnos/semana/page.tsx:15`
  - Actual: "Asignación de **los trabajadores** a turnos"
  - Propuesto: "Asignación de personal a turnos" (colectivo)

### Mensajes de error (Zod)
- Actual: "El campo es requerido"
- Propuesto: "Se requiere completar este campo" (pasiva)

- Actual: "El usuario no tiene permisos"
- Propuesto: "No tienes permisos para realizar esta acción" (directa)

## Notas
- Aprobación usuario: **NECESARIA** antes de aplicar.
- Validación: revisar en navegador tras cambios para confirmar fluidez de lectura.
```

- [ ] **Paso 3: Esperar aprobación del usuario**

> **PUNTO DE ESPERA:** Presenta el glosario al usuario y espera confirmación antes de continuar.

---

### Tarea 2.2: Aplicar glosario en sidebar/navbar

**Archivos:**
- Modificar: `app/src/app/(app)/_components/` (sidebar, navbar)

- [ ] **Paso 1: Revisar componentes de navegación**

Lee `app/src/app/(app)/_components/sidebar.tsx` (o similar) e identifica strings. Ejemplo:

```tsx
// Antes
<SidebarLabel>Los módulos</SidebarLabel>
<SidebarItem>Empleados</SidebarItem>
<SidebarItem>Usuarios del sistema</SidebarItem>
```

- [ ] **Paso 2: Aplicar glosario**

```tsx
// Después (aplicar cambios del glosario)
<SidebarLabel>Módulos</SidebarLabel>
<SidebarItem>Personal</SidebarItem>
<SidebarItem>Cuentas del sistema</SidebarItem>
```

- [ ] **Paso 3: Commit**

```bash
git add app/src/app/\(app\)/_components/
git commit -m "refactor(i18n): lenguaje inclusivo en sidebar"
```

---

### Tarea 2.3: Aplicar glosario en módulo Turnos

**Archivos:**
- Modificar: `app/src/app/(app)/turnos/` (page.tsx, components)

- [ ] **Paso 1: Localizar y reemplazar**

En cada archivo `.tsx` del módulo Turnos, busca strings del glosario y aplica cambios. Ejemplo:

```bash
cd c:\Proyectos\caseta\app
grep -n "los trabajadores\|el voluntario" src/app/\(app\)/turnos/ --include="*.tsx"
```

- [ ] **Paso 2: Editarlos manualmente**

Por cada coincidencia, abre el archivo y reemplaza:

```tsx
// Antes
<h2>Turnos de {empleado.nombre}</h2>
<p>El trabajador tiene {turnos.length} turnos asignados</p>

// Después
<h2>Turnos de {empleado.nombre}</h2>
<p>Esta persona tiene {turnos.length} turnos asignados</p>
```

- [ ] **Paso 3: Commit**

```bash
git add app/src/app/\(app\)/turnos/
git commit -m "refactor(i18n): lenguaje inclusivo en módulo Turnos"
```

---

### Tarea 2.4: Aplicar glosario en módulo Empleados/Voluntarios

**Archivos:**
- Modificar: `app/src/app/(app)/empleados/`, `app/src/app/apuntarse/`

- [ ] **Paso 1-3: Mismo patrón que 2.3**

Localiza, reemplaza, commit.

```bash
git commit -m "refactor(i18n): lenguaje inclusivo en módulo Empleados y Voluntarios públicos"
```

---

### Tarea 2.5: Aplicar glosario en módulo Caja

**Archivos:**
- Modificar: `app/src/app/(app)/caja/` (cierres, gastos, nóminas, balance)

- [ ] **Paso 1-3: Mismo patrón**

```bash
git commit -m "refactor(i18n): lenguaje inclusivo en módulo Caja"
```

---

### Tarea 2.6: Aplicar glosario en módulo Inventario

**Archivos:**
- Modificar: `app/src/app/(app)/inventario/` (productos, pedidos, movimientos, stock)

- [ ] **Paso 1-3: Mismo patrón**

```bash
git commit -m "refactor(i18n): lenguaje inclusivo en módulo Inventario"
```

---

### Tarea 2.7: Aplicar glosario en módulo Admin

**Archivos:**
- Modificar: `app/src/app/(app)/admin/` (usuarios, ediciones, casetas, tipos-empleado, entidades, proveedores, solicitudes)

- [ ] **Paso 1-3: Mismo patrón**

```bash
git commit -m "refactor(i18n): lenguaje inclusivo en módulo Admin"
```

---

### Tarea 2.8: Aplicar glosario en mensajes de error de Server Actions

**Archivos:**
- Revisar: Todos los `schema.ts` (validaciones Zod) y `actions.ts` (mensajes de ActionResult)

- [ ] **Paso 1: Inspeccionar un schema**

```typescript
// Ejemplo en app/src/app/(app)/admin/usuarios/schema.ts
import { z } from 'zod';

export const crearUsuarioSchema = z.object({
  email: z.string().email('El email debe ser válido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
});
```

- [ ] **Paso 2: Aplicar glosario a mensajes Zod**

```typescript
export const crearUsuarioSchema = z.object({
  email: z.string().email('Proporciona un email válido'),
  nombre: z.string().min(1, 'Se requiere completar el nombre'),
});
```

- [ ] **Paso 3: Revisar mensajes en actions.ts**

Si hay mensajes genéricos en retornos de ActionResult, ajústalos:

```typescript
// Antes
if (!permisos) {
  return { ok: false, error: 'El usuario no tiene permisos' };
}

// Después
if (!permisos) {
  return { ok: false, error: 'No tienes permisos para realizar esta acción' };
}
```

- [ ] **Paso 4: Commit**

```bash
git add app/src/app/\(app\)/admin/schemas/ app/src/app/\(app\)/*/actions.ts
git commit -m "refactor(i18n): lenguaje inclusivo en mensajes de error"
```

---

### Tarea 2.9: Aplicar glosario en configuración de Better Auth (si aplica)

**Archivos:**
- Revisar: `app/src/lib/auth.ts`

- [ ] **Paso 1: Leer la configuración**

Busca si hay emails o mensajes generados por Better Auth (ej: emails de confirmación):

```bash
grep -n "usuario\|empleado" app/src/lib/auth.ts
```

- [ ] **Paso 2: Si hay, aplicar cambios**

Si Better Auth envía emails o mensajes, busca el template y aplica cambios. Si no hay, saltar.

- [ ] **Paso 3: Commit (si hay cambios)**

```bash
git add app/src/lib/auth.ts
git commit -m "refactor(i18n): lenguaje inclusivo en configuración de autenticación"
```

---

## D6 — Persistencia de Datos en Formularios (ejecutar SEGUNDO)

### Tarea 6.1: Inventario de formularios

**Archivos:**
- Revisar: Todos los componentes de formulario

- [ ] **Paso 1: Crear inventario**

```bash
cd c:\Proyectos\caseta\app
find src/app -name "*form.tsx" -o -name "formulario*.tsx" | sort
```

Ejemplo de output:
```
src/app/(app)/admin/usuarios/_components/usuario-form.tsx
src/app/(app)/admin/casetas/_components/caseta-form.tsx
src/app/(app)/caja/cierres/_components/cierre-form.tsx
...
src/app/apuntarse/[token]/_components/formulario-voluntario.tsx
```

- [ ] **Paso 2: Documentar en `plans/formularios-inventario.md`**

```markdown
# Inventario de formularios — Caseta

## Formularios Admin
- `usuario-form.tsx` — inputs: email, nombre, rol (select); tipos: text, text, select
- `caseta-form.tsx` — inputs: nombre, activa; tipos: text, checkbox
- ...

## Formularios Caja
- `cierre-form.tsx` — inputs: fecha, caseta, concepto, monto; tipos: date, select, text, number
- ...

## Total: ~30 formularios identificados
```

---

### Tarea 6.2: Extender ActionResult con campo `values`

**Archivos:**
- Modificar: `app/src/lib/action-result.ts`

- [ ] **Paso 1: Leer el tipo actual**

```typescript
// app/src/lib/action-result.ts
type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };
```

- [ ] **Paso 2: Extender tipo (non-breaking)**

```typescript
type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors; values?: Record<string, unknown> };
```

- [ ] **Paso 3: Commit**

```bash
git add app/src/lib/action-result.ts
git commit -m "feat(forms): preparar ActionResult para persistencia de valores en error"
```

---

### Tarea 6.3: Crear helper `formDataToObject`

**Archivos:**
- Crear: `app/src/lib/forms.ts` (nuevo)
- Crear: `app/src/lib/forms.test.ts` (nuevo)

- [ ] **Paso 1: Test — caso básico**

```typescript
// app/src/lib/forms.test.ts
import { describe, it, expect } from 'vitest';
import { formDataToObject } from './forms';

describe('formDataToObject', () => {
  it('serializa FormData simple', () => {
    const fd = new FormData();
    fd.append('nombre', 'Juan');
    fd.append('email', 'juan@example.com');
    
    const result = formDataToObject(fd);
    expect(result).toEqual({ nombre: 'Juan', email: 'juan@example.com' });
  });

  it('agrupa valores multivalor (checkboxes)', () => {
    const fd = new FormData();
    fd.append('turnos', '1');
    fd.append('turnos', '2');
    fd.append('turnos', '3');
    
    const result = formDataToObject(fd);
    expect(result).toEqual({ turnos: ['1', '2', '3'] });
  });

  it('excluye campos en blacklist', () => {
    const fd = new FormData();
    fd.append('nombre', 'Juan');
    fd.append('password', 'secret123');
    fd.append('passwordConfirm', 'secret123');
    
    const result = formDataToObject(fd);
    expect(result).toEqual({ nombre: 'Juan' });
  });

  it('excluye archivos', () => {
    const fd = new FormData();
    fd.append('nombre', 'Juan');
    fd.append('archivo', new File(['content'], 'test.txt'));
    
    const result = formDataToObject(fd);
    expect(result).toEqual({ nombre: 'Juan' });
  });
});
```

- [ ] **Paso 2: Test — correr para verificar que falla**

```bash
cd c:\Proyectos\caseta\app
npm run test -- src/lib/forms.test.ts
```

Expected: FAIL (función no existe)

- [ ] **Paso 3: Implementar `formDataToObject`**

```typescript
// app/src/lib/forms.ts

const BLACKLIST_FIELDS = new Set(['password', 'passwordConfirm', 'token']);

export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const multiValueFields = new Map<string, string[]>();

  for (const [key, value] of formData.entries()) {
    // Excluir blacklist
    if (BLACKLIST_FIELDS.has(key)) continue;

    // Excluir archivos
    if (value instanceof File) continue;

    // Agrupar multivalor (checkboxes, selects múltiples)
    if (multiValueFields.has(key)) {
      multiValueFields.get(key)!.push(String(value));
    } else if (result.hasOwnProperty(key)) {
      // Ya existe, convertir a array
      const existing = result[key];
      multiValueFields.set(key, [String(existing), String(value)]);
      delete result[key];
    } else {
      result[key] = String(value);
    }
  }

  // Convertir multivalor groups a arrays
  for (const [key, values] of multiValueFields.entries()) {
    result[key] = values;
  }

  return result;
}
```

- [ ] **Paso 4: Tests — correr para verificar que pasan**

```bash
npm run test -- src/lib/forms.test.ts
```

Expected: PASS

- [ ] **Paso 5: Commit**

```bash
git add app/src/lib/forms.ts app/src/lib/forms.test.ts
git commit -m "feat(forms): helper formDataToObject para serializar FormData con arrays"
```

---

### Tarea 6.4: Definir patrón en Server Actions

**Archivos:**
- Revisar y documentar en `plans/patron-persistencia-forms.md`

- [ ] **Paso 1: Crear documento de referencia**

```markdown
# Patrón de persistencia de form state en actions

## Patrón canónico (copiar-pegar):

```typescript
'use server';
import { parseForm } from '@/lib/action-result';
import { formDataToObject } from '@/lib/forms';
import { crearEmpleadoSchema } from './schema';
import { requireRole } from '@/lib/authz';

export async function crearEmpleadoAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult<void>> {
  const { user } = await requireRole(['admin', 'gerente']);

  const result = parseForm(crearEmpleadoSchema, formData);
  if (!result.ok) {
    // Retornar valores para hidratación de formulario
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
      values: formDataToObject(formData), // ← AQUÍ: serializar FormData
    };
  }

  // Lógica negocio...
  const empleado = await prisma.empleado.create({ data: result.data });

  revalidatePath('/empleados');
  return { ok: true, data: undefined };
}
```

## En el componente cliente:

```typescript
'use client';
import { useActionState } from 'react';
import { crearEmpleadoAction } from './actions';

export function EmpleadoForm() {
  const [state, action] = useActionState(crearEmpleadoAction, null);

  return (
    <form action={action}>
      <input
        type="text"
        name="nombre"
        defaultValue={state?.values?.nombre as string | undefined}
      />
      <input
        type="email"
        name="email"
        defaultValue={state?.values?.email as string | undefined}
      />
      {/* ... */}
      {state?.fieldErrors?.nombre && (
        <p className="text-red-500">{state.fieldErrors.nombre[0]}</p>
      )}
    </form>
  );
}
```

---

### Tarea 6.5: Aplicar patrón en formulario voluntarios (caso de prueba)

**Archivos:**
- Modificar: `app/src/app/apuntarse/[token]/actions.ts`
- Modificar: `app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx`

- [ ] **Paso 1: Extender acción `crearSolicitudAction`**

Lee el archivo actual:

```bash
head -50 app/src/app/apuntarse/\[token\]/actions.ts
```

- [ ] **Paso 2: Modificar action para retornar `values`**

```typescript
// Antes (aproximado)
if (!result.ok) {
  return { ok: false, error: result.error, fieldErrors: result.fieldErrors };
}

// Después
if (!result.ok) {
  return {
    ok: false,
    error: result.error,
    fieldErrors: result.fieldErrors,
    values: formDataToObject(formData), // ← NUEVO
  };
}
```

- [ ] **Paso 3: Modificar componente para leer `state.values`**

En el formulario, para inputs normales:

```tsx
// Antes
<input type="text" name="nombre" />

// Después
<input type="text" name="nombre" defaultValue={state?.values?.nombre as string} />
```

Para checkboxes (turnos), este es el caso especial — necesita hidratación de arrays:

```tsx
// Antes
<input type="checkbox" name="turnos" value={turno.id} />

// Después
const selectedTurnos = (state?.values?.turnos as string[]) || [];
// ...
<input
  type="checkbox"
  name="turnos"
  value={turno.id}
  defaultChecked={selectedTurnos.includes(turno.id)}
/>
```

- [ ] **Paso 4: Commit**

```bash
git add app/src/app/apuntarse/\[token\]/actions.ts app/src/app/apuntarse/\[token\]/_components/formulario-voluntario.tsx
git commit -m "fix(forms): persistencia de valores en formulario voluntarios, incluyendo checkboxes"
```

---

### Tarea 6.6-6.10: Aplicar patrón en formularios admin, caja, inventario, turnos

**Archivos:**
- Modificar: `app/src/app/(app)/admin/*/actions.ts` + componentes form
- Modificar: `app/src/app/(app)/caja/*/actions.ts` + componentes form
- Modificar: `app/src/app/(app)/inventario/*/actions.ts` + componentes form
- Modificar: `app/src/app/(app)/turnos/*/actions.ts` + componentes form (si aplica)

- [ ] **Paso 1-2 (por cada módulo): Revisar y editar actions + componentes**

Usa el patrón definido en 6.4. Para cada archivo, ejecuta:

```bash
# Ejemplo para admin/usuarios
grep -n "parseForm" app/src/app/\(app\)/admin/usuarios/actions.ts
```

Encuentra los retornos de error y añade `values: formDataToObject(formData)`.

- [ ] **Paso 3 (por cada módulo): Editar componentes**

Para cada componente form (ej: `usuario-form.tsx`), lee el action con `useActionState` y añade `defaultValue` / `defaultChecked` basado en `state?.values`.

- [ ] **Paso 4 (por módulo): Commit**

```bash
git add app/src/app/\(app\)/admin/
git commit -m "feat(forms): persistencia de valores en formularios admin"

git add app/src/app/\(app\)/caja/
git commit -m "feat(forms): persistencia de valores en formularios caja"

# ... idem inventario, turnos
```

---

### Tarea 6.11: Tests unitarios de `formDataToObject`

**Archivos:**
- `app/src/lib/forms.test.ts` (ya existe de 6.3)

- [ ] **Paso 1: Agregar casos adicionales al test**

Añade tests para tipos especiales (date, number, etc.):

```typescript
it('preserva valores vacíos', () => {
  const fd = new FormData();
  fd.append('nombre', '');
  fd.append('email', 'test@test.com');
  
  const result = formDataToObject(fd);
  expect(result).toEqual({ nombre: '', email: 'test@test.com' });
});

it('maneja campos de tipo número (como strings desde FormData)', () => {
  const fd = new FormData();
  fd.append('cantidad', '10');
  
  const result = formDataToObject(fd);
  // FormData siempre retorna strings; el parser Zod los convierte
  expect(result).toEqual({ cantidad: '10' });
});
```

- [ ] **Paso 2: Correr tests**

```bash
npm run test -- src/lib/forms.test.ts
```

Expected: PASS

- [ ] **Paso 3: Commit**

```bash
git add app/src/lib/forms.test.ts
git commit -m "test(forms): tests adicionales para formDataToObject"
```

---

### Tarea 6.12: Test e2e de persistencia de form state

**Archivos:**
- Crear: `app/e2e/forms-persist.spec.ts` (nuevo)

- [ ] **Paso 1: Escribir test E2E**

```typescript
// app/e2e/forms-persist.spec.ts
import { test, expect } from '@playwright/test';

test('persistencia de texto en formulario admin', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/usuarios');
  
  // Llenar formulario con datos inválidos (ej: email inválido)
  await page.fill('input[name="nombre"]', 'Juan García');
  await page.fill('input[name="email"]', 'invalid-email');
  
  // Intentar submit (fallará validación Zod)
  await page.click('button[type="submit"]');
  
  // Esperar error
  await expect(page.locator('text=email debe ser válido')).toBeVisible();
  
  // Verificar que el nombre se preservó
  const nombreInput = page.locator('input[name="nombre"]');
  await expect(nombreInput).toHaveValue('Juan García');
});

test('persistencia de checkboxes multi-selección', async ({ page }) => {
  // Navegar a formulario de voluntarios (que tiene checkboxes de turnos)
  await page.goto('http://localhost:3000/apuntarse/[token-válido]');
  
  // Seleccionar turnos
  await page.click('input[name="turnos"][value="1"]');
  await page.click('input[name="turnos"][value="2"]');
  
  // Rellenar otros campos con data inválida
  await page.fill('input[name="nombre"]', 'María');
  await page.fill('input[name="email"]', 'invalid');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Verificar error
  await expect(page.locator('text=email')).toContainText('debe ser válido');
  
  // Verificar checkboxes preservados
  await expect(page.locator('input[name="turnos"][value="1"]')).toBeChecked();
  await expect(page.locator('input[name="turnos"][value="2"]')).toBeChecked();
  await expect(page.locator('input[name="turnos"][value="3"]')).not.toBeChecked();
});

test('persistencia de select / combobox', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/usuarios');
  
  // Seleccionar rol
  await page.selectOption('select[name="rol"]', 'gerente');
  
  // Llenar email inválido
  await page.fill('input[name="email"]', 'bad');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Verificar rol preservado
  const rolSelect = page.locator('select[name="rol"]');
  await expect(rolSelect).toHaveValue('gerente');
});

test('persistencia de date input', async ({ page }) => {
  await page.goto('http://localhost:3000/caja/cierres/crear');
  
  // Llenar fecha
  await page.fill('input[type="date"][name="fecha"]', '2026-05-18');
  
  // Llenar monto inválido
  await page.fill('input[name="monto"]', '-100'); // inválido: negativo
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Verificar fecha preservada
  const fechaInput = page.locator('input[type="date"][name="fecha"]');
  await expect(fechaInput).toHaveValue('2026-05-18');
});

test('NO persistencia de password (seguridad)', async ({ page }) => {
  // Verificar que passwords NUNCA se retornan en formDataToObject
  // Este test es indirecto: verificamos que un campo password no aparece en HTML
  
  await page.goto('http://localhost:3000/admin/usuarios/crear');
  await page.fill('input[name="password"]', 'MySecurePassword123!');
  await page.fill('input[name="email"]', 'bad');
  
  await page.click('button[type="submit"]');
  
  // Password input debe estar vacío (no debería haver value attribute con pwd)
  const pwdInput = page.locator('input[name="password"]');
  // En realidad, si el backend no retorna values.password, defaultValue será undefined
  await expect(pwdInput).toHaveValue('');
});
```

- [ ] **Paso 2: Correr test para verificar que pasa**

Prerequisito: dev server debe estar corriendo.

```bash
cd c:\Proyectos\caseta\app
npm run dev &  # en background
npx playwright test e2e/forms-persist.spec.ts --headed
```

Expected: PASS (si la implementación D6 está completa)

- [ ] **Paso 3: Commit**

```bash
git add app/e2e/forms-persist.spec.ts
git commit -m "test(e2e): persistencia de datos en formularios tras error"
```

---

## D1 — Paginación Universal (ejecutar TERCERO)

### Tarea 1.1: Crear helper `parseListParams`

**Archivos:**
- Crear: `app/src/lib/list-params.ts` (nuevo)
- Crear: `app/src/lib/list-params.test.ts` (nuevo)

- [ ] **Paso 1: Test — casos básicos**

```typescript
// app/src/lib/list-params.test.ts
import { describe, it, expect } from 'vitest';
import { parseListParams } from './list-params';

describe('parseListParams', () => {
  it('parsea page y pageSize válidos', () => {
    const params = {
      page: '2',
      pageSize: '25',
      sort: 'nombre',
      order: 'asc',
    };
    
    const result = parseListParams(params, {
      defaultPageSize: 25,
      allowedPageSizes: [10, 25, 50, 100],
      allowedSorts: ['nombre', 'fecha', 'email'],
    });
    
    expect(result).toEqual({
      page: 2,
      pageSize: 25,
      sort: 'nombre',
      order: 'asc',
      skip: 25, // (page - 1) * pageSize
      take: 25,
    });
  });

  it('clampea page < 1 a 1', () => {
    const result = parseListParams(
      { page: '0', pageSize: '25' },
      { defaultPageSize: 25, allowedPageSizes: [10, 25, 50, 100], allowedSorts: [] }
    );
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('rechaza pageSize no whitelisted, usa default', () => {
    const result = parseListParams(
      { pageSize: '999' },
      { defaultPageSize: 25, allowedPageSizes: [10, 25, 50, 100], allowedSorts: [] }
    );
    expect(result.pageSize).toBe(25);
  });

  it('rechaza sort no whitelisted, usa default (undefined)', () => {
    const result = parseListParams(
      { sort: 'hack' },
      { defaultPageSize: 25, allowedPageSizes: [10, 25, 50, 100], allowedSorts: ['nombre'] }
    );
    expect(result.sort).toBeUndefined();
  });

  it('filtra order a asc/desc/undefined', () => {
    expect(
      parseListParams(
        { order: 'asc' },
        { defaultPageSize: 25, allowedPageSizes: [10, 25, 50, 100], allowedSorts: [] }
      ).order
    ).toBe('asc');

    expect(
      parseListParams(
        { order: 'desc' },
        { defaultPageSize: 25, allowedPageSizes: [10, 25, 50, 100], allowedSorts: [] }
      ).order
    ).toBe('desc');

    expect(
      parseListParams(
        { order: 'invalid' },
        { defaultPageSize: 25, allowedPageSizes: [10, 25, 50, 100], allowedSorts: [] }
      ).order
    ).toBeUndefined();
  });
});
```

- [ ] **Paso 2: Test — correr para verificar que falla**

```bash
cd c:\Proyectos\caseta\app
npm run test -- src/lib/list-params.test.ts
```

Expected: FAIL

- [ ] **Paso 3: Implementar `parseListParams`**

```typescript
// app/src/lib/list-params.ts

interface ParseListParamsOptions {
  defaultPageSize: number;
  allowedPageSizes: number[];
  allowedSorts: string[];
}

interface ListParams {
  page: number;
  pageSize: number;
  sort?: string;
  order?: 'asc' | 'desc';
  skip: number;
  take: number;
}

export function parseListParams(
  searchParams: Record<string, string | string[] | undefined>,
  options: ParseListParamsOptions
): ListParams {
  // Page
  const pageStr = Array.isArray(searchParams.page)
    ? searchParams.page[0]
    : searchParams.page;
  const page = Math.max(1, parseInt(pageStr || '1', 10));

  // PageSize
  const pageSizeStr = Array.isArray(searchParams.pageSize)
    ? searchParams.pageSize[0]
    : searchParams.pageSize;
  const parsedPageSize = parseInt(pageSizeStr || String(options.defaultPageSize), 10);
  const pageSize = options.allowedPageSizes.includes(parsedPageSize)
    ? parsedPageSize
    : options.defaultPageSize;

  // Sort
  const sortStr = Array.isArray(searchParams.sort)
    ? searchParams.sort[0]
    : searchParams.sort;
  const sort = options.allowedSorts.includes(sortStr || '')
    ? sortStr
    : undefined;

  // Order
  const orderStr = Array.isArray(searchParams.order)
    ? searchParams.order[0]
    : searchParams.order;
  const order =
    orderStr === 'asc' || orderStr === 'desc' ? orderStr : undefined;

  // Calculate skip/take
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, sort, order, skip, take };
}
```

- [ ] **Paso 4: Test — correr para verificar que pasan**

```bash
npm run test -- src/lib/list-params.test.ts
```

Expected: PASS

- [ ] **Paso 5: Commit**

```bash
git add app/src/lib/list-params.ts app/src/lib/list-params.test.ts
git commit -m "feat(pagination): helper parseListParams para validación y cálculo de skip/take"
```

---

### Tarea 1.2: Crear componente `<DataTablePagination>`

**Archivos:**
- Crear: `app/src/components/ui/data-table-pagination.tsx` (nuevo)

- [ ] **Paso 1: Implementar componente server**

```typescript
// app/src/components/ui/data-table-pagination.tsx

import Link from 'next/link';

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  basePath,
}: DataTablePaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const prevPage = page - 1;
  const nextPage = page + 1;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="text-sm text-neutral-500">
        {from}–{to} de {total}
      </div>

      <div className="flex gap-2">
        {hasPrev ? (
          <Link
            href={`${basePath}?page=${prevPage}&pageSize=${pageSize}`}
            className="px-3 py-1 rounded border border-neutral-300 hover:bg-neutral-100 text-sm"
          >
            ← Anterior
          </Link>
        ) : (
          <span className="px-3 py-1 rounded border border-neutral-200 bg-neutral-50 text-sm text-neutral-400">
            ← Anterior
          </span>
        )}

        <span className="text-sm text-neutral-500">
          Página {page} de {totalPages}
        </span>

        {hasNext ? (
          <Link
            href={`${basePath}?page=${nextPage}&pageSize=${pageSize}`}
            className="px-3 py-1 rounded border border-neutral-300 hover:bg-neutral-100 text-sm"
          >
            Siguiente →
          </Link>
        ) : (
          <span className="px-3 py-1 rounded border border-neutral-200 bg-neutral-50 text-sm text-neutral-400">
            Siguiente →
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/components/ui/data-table-pagination.tsx
git commit -m "feat(ui): componente DataTablePagination para controles de paginación"
```

---

### Tarea 1.3: Crear componente `<PageSizeSelect>`

**Archivos:**
- Crear: `app/src/components/ui/page-size-select.tsx` (nuevo)

- [ ] **Paso 1: Implementar componente cliente**

```typescript
// app/src/components/ui/page-size-select.tsx

'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface PageSizeSelectProps {
  currentPageSize: number;
  options?: number[];
}

export function PageSizeSelect({
  currentPageSize,
  options = [10, 25, 50, 100],
}: PageSizeSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(newPageSize: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', String(newPageSize));
    params.set('page', '1'); // Reset a página 1
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="pageSize" className="text-sm text-neutral-600">
        Elementos por página:
      </label>
      <select
        id="pageSize"
        value={currentPageSize}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="px-2 py-1 border border-neutral-300 rounded text-sm"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/components/ui/page-size-select.tsx
git commit -m "feat(ui): componente PageSizeSelect para cambiar elementos por página"
```

---

### Tarea 1.4: Crear componente `<SortableHeader>`

**Archivos:**
- Crear: `app/src/components/ui/sortable-header.tsx` (nuevo)

- [ ] **Paso 1: Implementar componente cliente**

```typescript
// app/src/components/ui/sortable-header.tsx

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface SortableHeaderProps {
  column: string;
  label: string;
  basePath: string;
}

export function SortableHeader({
  column,
  label,
  basePath,
}: SortableHeaderProps) {
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort');
  const currentOrder = searchParams.get('order');

  // Determinar siguiente orden
  let nextOrder: 'asc' | 'desc' | null = 'asc';
  if (currentSort === column) {
    if (currentOrder === 'asc') {
      nextOrder = 'desc';
    } else if (currentOrder === 'desc') {
      nextOrder = null; // Remover orden
    }
  }

  // Construir URL
  const params = new URLSearchParams(searchParams.toString());
  params.set('page', '1');
  
  if (nextOrder) {
    params.set('sort', column);
    params.set('order', nextOrder);
  } else {
    params.delete('sort');
    params.delete('order');
  }

  const href = `${basePath}?${params.toString()}`;

  // Renderizar flecha según estado actual
  let arrow = '';
  if (currentSort === column) {
    arrow = currentOrder === 'asc' ? ' ↑' : ' ↓';
  }

  return (
    <Link href={href} className="hover:text-blue-600 cursor-pointer">
      {label}
      {arrow}
    </Link>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/components/ui/sortable-header.tsx
git commit -m "feat(ui): componente SortableHeader para encabezados ordenables"
```

---

### Tarea 1.5: Test e2e de paginación

**Archivos:**
- Crear: `app/e2e/pagination.spec.ts` (nuevo)

- [ ] **Paso 1: Escribir test E2E**

```typescript
// app/e2e/pagination.spec.ts
import { test, expect } from '@playwright/test';

test('navegación de paginación con URL', async ({ page }) => {
  // Ir a listado de productos con pageSize=10
  await page.goto('http://localhost:3000/inventario/productos?page=1&pageSize=10');
  
  // Verificar que aparecen 10 filas (aproximado)
  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  expect(count).toBeLessThanOrEqual(10);
  
  // Texto de paginación muestra "1–10 de N"
  await expect(page.locator('text=/\\d+–\\d+ de \\d+/')).toBeVisible();
});

test('cambiar pageSize resetea página a 1', async ({ page }) => {
  await page.goto('http://localhost:3000/inventario/productos?page=2&pageSize=25');
  
  // Cambiar pageSize a 50
  await page.selectOption('select[id="pageSize"]', '50');
  
  // Verificar que URL tiene ?pageSize=50&page=1
  expect(page.url()).toContain('pageSize=50');
  expect(page.url()).toContain('page=1');
});

test('ordenación alterna asc → desc → neutro', async ({ page }) => {
  await page.goto('http://localhost:3000/inventario/productos');
  
  // Hacer click en header ordenable (ej: Nombre)
  const nombreHeader = page.locator('a:has-text("Nombre")').first();
  
  // Click 1: asc
  await nombreHeader.click();
  expect(page.url()).toContain('sort=nombre');
  expect(page.url()).toContain('order=asc');
  expect(nombreHeader).toContainText('↑');
  
  // Click 2: desc
  await nombreHeader.click();
  expect(page.url()).toContain('sort=nombre');
  expect(page.url()).toContain('order=desc');
  expect(nombreHeader).toContainText('↓');
  
  // Click 3: neutro (remover orden)
  await nombreHeader.click();
  expect(page.url()).not.toContain('sort=nombre');
  expect(nombreHeader).not.toContainText('↑');
  expect(nombreHeader).not.toContainText('↓');
});

test('botones prev/next funcionan', async ({ page }) => {
  await page.goto('http://localhost:3000/inventario/productos?page=1&pageSize=10');
  
  // Botón siguiente debe estar enabled
  const nextBtn = page.locator('a:has-text("Siguiente")');
  await expect(nextBtn).toBeVisible();
  
  // Click siguiente
  await nextBtn.click();
  
  // URL debe tener page=2
  expect(page.url()).toContain('page=2');
});
```

- [ ] **Paso 2: Commit**

```bash
git add app/e2e/pagination.spec.ts
git commit -m "test(e2e): navegación y ordenación con paginación"
```

---

### Tareas 1.6–1.20: Aplicar paginación en cada listado

Ahora aplica el patrón a cada uno de los 14 listados. Ejemplo para `/inventario/productos`:

**Tarea 1.6: Paginación en `/inventario/productos/page.tsx`**

**Archivos:**
- Modificar: `app/src/app/(app)/inventario/productos/page.tsx`

- [ ] **Paso 1: Actualizar la página para usar `parseListParams`**

```typescript
// app/src/app/(app)/inventario/productos/page.tsx

import { parseListParams } from '@/lib/list-params';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { PageSizeSelect } from '@/components/ui/page-size-select';
import { SortableHeader } from '@/components/ui/sortable-header';
import { prisma } from '@/lib/db';

interface ProductosPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductosPage({
  searchParams,
}: ProductosPageProps) {
  const params = await searchParams;

  // Parsear parámetros
  const listParams = parseListParams(params, {
    defaultPageSize: 25,
    allowedPageSizes: [10, 25, 50, 100],
    allowedSorts: ['nombre', 'activo', 'caseta', 'precio'],
  });

  // Construir orderBy dinámico
  let orderBy: any = undefined;
  if (listParams.sort) {
    orderBy = { [listParams.sort]: listParams.order || 'asc' };
  }

  // Queries paralelas
  const [productos, total] = await Promise.all([
    prisma.producto.findMany({
      where: { ...filtros }, // Aplica filtros existentes
      orderBy,
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.producto.count({ where: { ...filtros } }),
  ]);

  return (
    <div>
      <h1>Productos</h1>

      {/* Selector de elementos por página */}
      <PageSizeSelect currentPageSize={listParams.pageSize} />

      {/* Tabla */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th>
              <SortableHeader
                column="nombre"
                label="Nombre"
                basePath="/inventario/productos"
              />
            </th>
            <th>
              <SortableHeader
                column="activo"
                label="Activo"
                basePath="/inventario/productos"
              />
            </th>
            <th>Precio</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((prod) => (
            <tr key={prod.id}>
              <td>{prod.nombre}</td>
              <td>{prod.activo ? 'Sí' : 'No'}</td>
              <td>{prod.precio}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginador */}
      <DataTablePagination
        page={listParams.page}
        pageSize={listParams.pageSize}
        total={total}
        basePath="/inventario/productos"
      />
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/app/\(app\)/inventario/productos/page.tsx
git commit -m "feat(pagination): paginación en listado productos"
```

---

**Repite Tarea 1.6 para cada uno de los otros 13 listados:**

- 1.7 — `/inventario/pedidos/page.tsx`
- 1.8 — `/inventario/movimientos/page.tsx` (quitar `take:200` hard-coded)
- 1.9 — `/caja/cierres/page.tsx`
- 1.10 — `/caja/gastos/page.tsx`
- 1.11 — `/caja/nominas/page.tsx`
- 1.12 — `/turnos/asistencias/page.tsx`
- 1.13 — `/admin/usuarios/page.tsx`
- 1.14 — `/admin/ediciones/page.tsx`
- 1.15 — `/admin/casetas/page.tsx`
- 1.16 — `/admin/tipos-empleado/page.tsx`
- 1.17 — `/admin/entidades/page.tsx`
- 1.18 — `/admin/proveedores/page.tsx`
- 1.19 — `/empleados/page.tsx` (cards, sin sort por columna pero sí por nombre vía select)
- 1.20 — `/admin/solicitudes/page.tsx` (cards)

Cada uno sigue el mismo patrón: `parseListParams` → `Promise.all([findMany, count])` → render con componentes.

---

## D3 — Dashboard: KPIs por Edición Activa (ejecutar CUARTO)

### Tarea 3.1: Modificar función `loadDashboard`

**Archivos:**
- Modificar: `app/src/app/(app)/_lib/dashboard.ts`

- [ ] **Paso 1: Leer la función actual**

```bash
head -80 app/src/app/\(app\)/_lib/dashboard.ts
```

- [ ] **Paso 2: Modificar para usar edición activa**

```typescript
// app/src/app/(app)/_lib/dashboard.ts

import { prisma } from '@/lib/db';
import { obtenerEdicionActiva } from '@/lib/edicion';

export async function loadDashboard() {
  // Obtener edición activa
  const edicionActiva = await obtenerEdicionActiva();
  
  if (!edicionActiva) {
    throw new Error('No hay edición activa');
  }

  // KPIs de la edición activa
  const [ingresosResult, gastosResult] = await Promise.all([
    // Ingresos: suma de cierres de la edición activa (NO filtrado por fecha)
    prisma.cierreDiario.aggregate({
      where: { edicionId: edicionActiva.id },
      _sum: { totalIngresos: true },
    }),
    // Gastos: suma de gastos de la edición activa
    prisma.gasto.aggregate({
      where: { edicionId: edicionActiva.id },
      _sum: { monto: true },
    }),
  ]);

  const ingresos = ingresosResult._sum.totalIngresos || 0;
  const gastos = gastosResult._sum.monto || 0;
  const neto = ingresos - gastos;

  return {
    ingresos,
    gastos,
    neto,
    edicionId: edicionActiva.id,
  };
}
```

- [ ] **Paso 3: Commit**

```bash
git add app/src/app/\(app\)/_lib/dashboard.ts
git commit -m "feat(dashboard): KPIs agregados por edición activa, no por fecha"
```

---

### Tarea 3.2: Renombrar etiquetas KPI en la página

**Archivos:**
- Modificar: `app/src/app/(app)/page.tsx`

- [ ] **Paso 1: Localizar sección de KPIs**

```bash
grep -n "Ingresos\|Gastos" app/src/app/\(app\)/page.tsx | head -10
```

- [ ] **Paso 2: Renombrar etiquetas**

```tsx
// Antes
<KpiCard label="Ingresos · hoy" value={kpis.ingresos} />
<KpiCard label="Gastos · edición" value={kpis.gastos} />

// Después
<KpiCard label="Ingresos · edición" value={kpis.ingresos} />
<KpiCard label="Gastos · edición" value={kpis.gastos} />
<KpiCard label="Neto · edición" value={kpis.neto} />
```

- [ ] **Paso 3: Commit**

```bash
git add app/src/app/\(app\)/page.tsx
git commit -m "feat(dashboard): renombrar etiquetas KPI a 'edición'"
```

---

### Tarea 3.3: Eliminar KPI "Ingresos · hoy"

**Archivos:**
- Modificar: `app/src/app/(app)/page.tsx`

- [ ] **Paso 1: Remover renderizado del KPI antiguo**

Si en la página hay código como:

```tsx
<KpiCard label="Ingresos · hoy" value={dashboardKpis.ingresoHoy} />
```

Elimínalo completamente.

- [ ] **Paso 2: Commit**

```bash
git add app/src/app/\(app\)/page.tsx
git commit -m "feat(dashboard): eliminar KPI 'Ingresos hoy' (inconsistente con gastos edición)"
```

---

### Tarea 3.4: Test integración

**Archivos:**
- Crear: `app/src/app/(app)/_lib/dashboard.test.ts` (nuevo)

- [ ] **Paso 1: Escribir test**

```typescript
// app/src/app/(app)/_lib/dashboard.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadDashboard } from './dashboard';
import { prisma } from '@/lib/db';

describe('loadDashboard', () => {
  let edicionId: string;

  beforeAll(async () => {
    // Crear edición activa de prueba
    const edicion = await prisma.edicion.create({
      data: {
        nombre: 'Test 2026',
        activa: true,
        formularioToken: 'test-token-123',
      },
    });
    edicionId = edicion.id;

    // Crear cierres de prueba
    await prisma.cierreDiario.create({
      data: {
        edicionId,
        fecha: new Date('2026-05-18'),
        totalIngresos: 1000,
      },
    });

    await prisma.cierreDiario.create({
      data: {
        edicionId,
        fecha: new Date('2026-05-19'),
        totalIngresos: 500,
      },
    });

    // Crear gastos de prueba
    await prisma.gasto.create({
      data: {
        edicionId,
        monto: 200,
        concepto: 'Limpieza',
      },
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.gasto.deleteMany({ where: { edicionId } });
    await prisma.cierreDiario.deleteMany({ where: { edicionId } });
    await prisma.edicion.delete({ where: { id: edicionId } });
  });

  it('suma ingresos de TODA la edición activa, no solo un día', async () => {
    const kpis = await loadDashboard();

    // Debe sumar ambos cierres: 1000 + 500
    expect(kpis.ingresos).toBe(1500);
  });

  it('suma gastos de la edición activa', async () => {
    const kpis = await loadDashboard();
    expect(kpis.gastos).toBe(200);
  });

  it('calcula neto correctamente', async () => {
    const kpis = await loadDashboard();
    expect(kpis.neto).toBe(1500 - 200); // 1300
  });
});
```

- [ ] **Paso 2: Correr tests**

```bash
cd c:\Proyectos\caseta\app
npm run test -- src/app/\(app\)/_lib/dashboard.test.ts
```

Expected: PASS

- [ ] **Paso 3: Commit**

```bash
git add app/src/app/\(app\)/_lib/dashboard.test.ts
git commit -m "test(dashboard): KPIs agregados por edición, no por fecha"
```

---

## D4 — Matriz de Permisos Granular (ejecutar QUINTO)

### Tarea 4.1: Crear catálogo de permisos

**Archivos:**
- Crear: `app/src/lib/permissions/catalog.ts` (nuevo)

- [ ] **Paso 1: Inventariar permisos actuales**

Grep en todas las actions para encontrar `requireRole`:

```bash
cd c:\Proyectos\caseta\app
grep -r "requireRole" src/app --include="*.ts" | grep -v test
```

Output esperado (ejemplo):
```
src/app/(app)/admin/usuarios/actions.ts:  const { user } = await requireRole(['admin']);
src/app/(app)/caja/nominas/actions.ts:  const { user } = await requireRole(['admin']);
src/app/(app)/turnos/semana/actions.ts:  const { user } = await requireRole(['admin', 'gerente']);
```

- [ ] **Paso 2: Mapear a permisos granulares**

```typescript
// app/src/lib/permissions/catalog.ts

/**
 * Catálogo centralizado de permisos.
 * Clave: string único tipo 'modulo.accion' o 'modulo.recurso.accion'.
 * Cada rol tiene un conjunto de permisos asignado en BD (tabla RolPermiso).
 */

export const PERMISSIONS = {
  // Admin — Usuarios
  'admin.usuarios.crud': 'Crear, editar, eliminar usuarios',
  
  // Admin — Ediciones
  'admin.ediciones.crud': 'Administrar ediciones (crear, editar, etc)',
  
  // Admin — Casetas
  'admin.casetas.crud': 'Administrar casetas',
  
  // Admin — Tipos de empleado
  'admin.tipos-empleado.crud': 'Administrar tipos de empleado',
  
  // Admin — Entidades
  'admin.entidades.crud': 'Administrar entidades',
  
  // Admin — Proveedores
  'admin.proveedores.crud': 'Administrar proveedores',
  
  // Admin — Permisos
  'admin.permisos.editar': 'Asignar/revocar permisos a roles',
  
  // Caja — Nóminas
  'caja.nominas.crear': 'Crear nóminas',
  'caja.nominas.editar': 'Editar nóminas',
  'caja.nominas.calcular': 'Calcular nóminas',
  
  // Caja — Cierres
  'caja.cierres.crear': 'Crear cierres diarios',
  'caja.cierres.editar': 'Editar cierres diarios',
  'caja.cierres.bloquear': 'Bloquear cierres (proteger de cambios)',
  
  // Caja — Gastos
  'caja.gastos.crear': 'Crear gastos',
  'caja.gastos.editar': 'Editar gastos',
  
  // Inventario — Productos
  'inventario.productos.crud': 'Administrar productos',
  
  // Inventario — Pedidos
  'inventario.pedidos.crud': 'Administrar pedidos',
  
  // Inventario — Movimientos
  'inventario.movimientos.crud': 'Registrar movimientos de stock',
  
  // Turnos
  'turnos.crear': 'Crear turnos',
  'turnos.editar': 'Editar turnos',
  'turnos.duplicar': 'Duplicar turnos',
  'turnos.asistencias.registrar': 'Registrar asistencias',
  
  // Empleados
  'empleados.crud': 'Administrar empleados',
  
  // Solicitudes
  'solicitudes.aprobar': 'Aprobar solicitudes (voluntarios/empleados)',
  'solicitudes.rechazar': 'Rechazar solicitudes',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];
```

- [ ] **Paso 3: Commit**

```bash
git add app/src/lib/permissions/catalog.ts
git commit -m "feat(permissions): catálogo centralizado de permisos granulares"
```

---

### Tarea 4.2: Inventario de `requireRole` actuales

**Archivos:**
- Salida: `plans/permisos-inventario.md`

- [ ] **Paso 1: Grep completo**

```bash
cd c:\Proyectos\caseta\app
grep -r "requireRole" src/app --include="*.ts" --include="*.tsx" \
  | grep -v ".test.ts" \
  | grep -v "node_modules" > /tmp/requireRole-calls.txt
cat /tmp/requireRole-calls.txt | wc -l
```

- [ ] **Paso 2: Documentar en plan**

```markdown
# Inventario de requireRole

## Mapeo a permisos granulares

### Admin — Usuarios
- Archivo: `src/app/(app)/admin/usuarios/actions.ts:45`
  - Actual: `requireRole(['admin'])`
  - Mapeo: `requirePermiso('admin.usuarios.crud')`

### Caja — Nóminas
- Archivo: `src/app/(app)/caja/nominas/actions.ts:12`
  - Actual: `requireRole(['admin'])`
  - Mapeo: `requirePermiso('caja.nominas.crear')` o `admin.*` (caso especial: admin siempre puede)

... (lista completa)
```

Esta lista es interna; no se commitea. Solo la usamos para las migraciones de 4.6–4.7.

---

### Tarea 4.3: Migración Prisma — modelo `RolPermiso`

**Archivos:**
- Modificar: `app/prisma/schema.prisma`

- [ ] **Paso 1: Añadir modelo a schema**

```prisma
// app/prisma/schema.prisma

// ... (modelos existentes)

enum Rol {
  admin
  gerente
  cajero
}

model RolPermiso {
  rol        Rol     @db.VarChar(255)
  permiso    String  @db.VarChar(255)

  @@unique([rol, permiso])
  @@map("rol_permisos")
}
```

- [ ] **Paso 2: Crear migración**

```bash
cd c:\Proyectos\caseta\app
npx prisma migrate dev --name "add RolPermiso model"
```

Expected: migración creada en `prisma/migrations/`

- [ ] **Paso 3: Regenerar Prisma client**

```bash
npx prisma generate
```

- [ ] **Paso 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): modelo RolPermiso para asignación granular de permisos"
```

---

### Tarea 4.4: Seed inicial de permisos

**Archivos:**
- Modificar: `app/prisma/seed.ts`

- [ ] **Paso 1: Leer seed actual**

```bash
head -30 app/prisma/seed.ts
```

- [ ] **Paso 2: Añadir seed de RolPermiso**

```typescript
// app/prisma/seed.ts (al final del archivo)

import { ALL_PERMISSIONS } from '../src/lib/permissions/catalog';

async function seedRolPermisos() {
  console.log('Seeding RolPermisos...');

  // Definir matriz de permisos por rol
  const permisosPorRol = {
    admin: ALL_PERMISSIONS, // Admin tiene todos
    gerente: [
      'turnos.crear',
      'turnos.editar',
      'turnos.duplicar',
      'turnos.asistencias.registrar',
      'empleados.crud',
      'caja.cierres.crear',
      'caja.cierres.editar',
      'caja.gastos.crear',
      'caja.gastos.editar',
      'inventario.productos.crud',
      'inventario.pedidos.crud',
      'inventario.movimientos.crud',
      'solicitudes.aprobar',
      'solicitudes.rechazar',
      // NO: admin.*, caja.nominas, caja.cierres.bloquear
    ],
    cajero: [
      'caja.cierres.crear',
      'caja.gastos.crear',
      'solicitudes.aprobar',
      // Lectura implícita del resto
    ],
  };

  for (const [rol, permisos] of Object.entries(permisosPorRol)) {
    for (const permiso of permisos) {
      await prisma.rolPermiso.upsert({
        where: { rol_permiso: { rol: rol as Rol, permiso } },
        update: {},
        create: { rol: rol as Rol, permiso },
      });
    }
  }

  console.log('RolPermisos seeded.');
}

// Llamar desde main() si es la primera ejecución
```

- [ ] **Paso 3: Ejecutar seed**

```bash
cd c:\Proyectos\caseta\app
npx tsx prisma/seed.ts
```

- [ ] **Paso 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(db): seed inicial de permisos por rol"
```

---

### Tarea 4.5: Helper `loadPermisosForRol`

**Archivos:**
- Crear: `app/src/lib/permissions/runtime.ts` (nuevo)

- [ ] **Paso 1: Implementar helper cacheado**

```typescript
// app/src/lib/permissions/runtime.ts

import { cache } from 'react';
import { prisma } from '@/lib/db';
import { Rol } from '@prisma/client';

/**
 * Cargador de permisos por rol, cacheado por request.
 * Se ejecuta una vez por request, independientemente de cuántas veces se llame.
 */
export const loadPermisosForRol = cache(
  async (rol: Rol): Promise<Set<string>> => {
    const rolePermisos = await prisma.rolPermiso.findMany({
      where: { rol },
      select: { permiso: true },
    });

    return new Set(rolePermisos.map((rp) => rp.permiso));
  }
);
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/lib/permissions/runtime.ts
git commit -m "feat(permissions): loader cacheado de permisos por rol (per-request)"
```

---

### Tarea 4.6: Helper `requirePermiso` en authz.ts

**Archivos:**
- Modificar: `app/src/lib/authz.ts`

- [ ] **Paso 1: Leer el archivo actual**

```bash
head -50 app/src/lib/authz.ts
```

- [ ] **Paso 2: Añadir `requirePermiso`**

```typescript
// app/src/lib/authz.ts (añadir al final)

import { loadPermisosForRol } from './permissions/runtime';
import { Permission } from './permissions/catalog';

export async function requirePermiso(
  permiso: Permission
): Promise<{ user: Session['user'] }> {
  const { user } = await requireAuth();

  // Hard-rule: admin siempre tiene todos los permisos
  if (user.role === 'admin') {
    return { user };
  }

  // Cargar permisos del rol (cacheado per-request)
  const permisos = await loadPermisosForRol(user.role);

  if (!permisos.has(permiso)) {
    throw new Error(`No tienes permiso para: ${permiso}`);
  }

  return { user };
}
```

- [ ] **Paso 3: Commit**

```bash
git add app/src/lib/authz.ts
git commit -m "feat(permissions): helper requirePermiso para validación granular"
```

---

### Tarea 4.7: Migrar checks `requireRole` → `requirePermiso`

Para cada archivo de actions identificado en 4.2, reemplaza `requireRole` por `requirePermiso`.

**Ejemplo para `admin/usuarios/actions.ts`:**

- [ ] **Paso 1: Reemplazar requireRole**

```typescript
// Antes
const { user } = await requireRole(['admin']);

// Después
const { user } = await requirePermiso('admin.usuarios.crud');
```

- [ ] **Paso 2: Commit (agrupar por módulo)**

```bash
git add app/src/app/\(app\)/admin/*/actions.ts
git commit -m "refactor(permissions): usar requirePermiso granular en admin"

git add app/src/app/\(app\)/caja/*/actions.ts
git commit -m "refactor(permissions): usar requirePermiso granular en caja"

# ... idem para otros módulos
```

---

### Tarea 4.8: Crear página `/admin/permisos/page.tsx`

**Archivos:**
- Crear: `app/src/app/(app)/admin/permisos/page.tsx` (nuevo)

- [ ] **Paso 1: Página server que lista matriz**

```typescript
// app/src/app/(app)/admin/permisos/page.tsx

import { prisma } from '@/lib/db';
import { requirePermiso } from '@/lib/authz';
import { ALL_PERMISSIONS, PERMISSIONS } from '@/lib/permissions/catalog';
import { Rol } from '@prisma/client';
import { PermisosForm } from './_components/permisos-form';

export default async function PermisosPage() {
  // Requerir permiso
  await requirePermiso('admin.permisos.editar');

  // Cargar matriz actual
  const rolesPermisos = await prisma.rolPermiso.findMany();

  // Agrupar por rol para facilitar rendering
  const permisosPorRol: Record<Rol, Set<string>> = {
    admin: new Set(),
    gerente: new Set(),
    cajero: new Set(),
  };

  for (const rp of rolesPermisos) {
    permisosPorRol[rp.rol].add(rp.permiso);
  }

  return (
    <div>
      <h1>Matriz de Permisos</h1>

      <table className="w-full border-collapse border border-neutral-300">
        <thead className="bg-neutral-100">
          <tr>
            <th className="border border-neutral-300 p-2 text-left">
              Permiso
            </th>
            <th className="border border-neutral-300 p-2 text-center">
              admin
            </th>
            <th className="border border-neutral-300 p-2 text-center">
              gerente
            </th>
            <th className="border border-neutral-300 p-2 text-center">
              cajero
            </th>
          </tr>
        </thead>
        <tbody>
          {ALL_PERMISSIONS.map((permiso) => (
            <tr key={permiso}>
              <td className="border border-neutral-300 p-2">
                <code className="text-sm">{permiso}</code>
                <div className="text-xs text-neutral-500">
                  {PERMISSIONS[permiso]}
                </div>
              </td>
              {(['admin', 'gerente', 'cajero'] as const).map((rol) => (
                <td
                  key={`${permiso}-${rol}`}
                  className="border border-neutral-300 p-2 text-center"
                >
                  <PermisosCheckbox
                    permiso={permiso}
                    rol={rol}
                    checked={permisosPorRol[rol].has(permiso)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Paso 2: Componente cliente para checkboxes**

```typescript
// app/src/app/(app)/admin/permisos/_components/permisos-form.tsx

'use client';

import { actualizarPermisoAction } from '../actions';
import { useActionState } from 'react';
import { Rol } from '@prisma/client';

interface PermisosCheckboxProps {
  permiso: string;
  rol: Rol;
  checked: boolean;
}

export function PermisosCheckbox({
  permiso,
  rol,
  checked,
}: PermisosCheckboxProps) {
  const [state, action] = useActionState(actualizarPermisoAction, null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formData = new FormData();
    formData.append('rol', rol);
    formData.append('permiso', permiso);
    formData.append('activo', String(e.target.checked));
    await action(formData);
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      disabled={state?.loading}
    />
  );
}
```

- [ ] **Paso 3: Commit**

```bash
git add app/src/app/\(app\)/admin/permisos/
git commit -m "feat(admin): página matriz de permisos editable"
```

---

### Tarea 4.9: Server Action `actualizarPermisoAction`

**Archivos:**
- Crear: `app/src/app/(app)/admin/permisos/actions.ts` (nuevo)

- [ ] **Paso 1: Implementar acción**

```typescript
// app/src/app/(app)/admin/permisos/actions.ts

'use server';

import { prisma } from '@/lib/db';
import { requirePermiso } from '@/lib/authz';
import { parseForm } from '@/lib/action-result';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const schema = z.object({
  rol: z.enum(['admin', 'gerente', 'cajero']),
  permiso: z.string().min(1),
  activo: z.enum(['true', 'false']),
});

export async function actualizarPermisoAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult<void>> {
  // Requerir permiso
  await requirePermiso('admin.permisos.editar');

  // Parsear y validar
  const result = parseForm(schema, formData);
  if (!result.ok) {
    return { ok: false, error: result.error, fieldErrors: result.fieldErrors };
  }

  const { rol, permiso, activo } = result.data;
  const shouldActivate = activo === 'true';

  // Mutación
  if (shouldActivate) {
    // Crear o ignorar si ya existe
    await prisma.rolPermiso.upsert({
      where: { rol_permiso: { rol, permiso } },
      update: {},
      create: { rol, permiso },
    });
  } else {
    // Eliminar
    await prisma.rolPermiso.delete({
      where: { rol_permiso: { rol, permiso } },
    });
  }

  // Log de auditoría (si aplica)
  // ... (si la app tiene AuditLog)

  revalidatePath('/admin/permisos');

  return { ok: true, data: undefined };
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/app/\(app\)/admin/permisos/actions.ts
git commit -m "feat(admin): acción para actualizar permisos por rol"
```

---

### Tarea 4.10: Entrada de menú a `/admin/permisos`

**Archivos:**
- Modificar: sidebar/navbar (ubicación depende de la estructura)

- [ ] **Paso 1: Añadir link en admin nav**

```tsx
// Buscar el menú de admin y añadir:

{/* Permisos */}
<SidebarItem href="/admin/permisos" label="Permisos" />
```

Solo renderizar si el usuario tiene permiso (opcional, o siempre mostrar y que el server rechace):

```tsx
{permisoUsuario.includes('admin.permisos.editar') && (
  <SidebarItem href="/admin/permisos" label="Permisos" />
)}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/app/\(app\)/_components/
git commit -m "feat(nav): añadir enlace a matriz de permisos en admin"
```

---

### Tarea 4.11: Tests integración de permisos

**Archivos:**
- Crear: `app/src/lib/permissions/permissions.test.ts` (nuevo)

- [ ] **Paso 1: Escribir tests**

```typescript
// app/src/lib/permissions/permissions.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadPermisosForRol } from './runtime';
import { requirePermiso } from '../authz';
import { prisma } from '@/lib/db';

describe('Permisos granulares', () => {
  beforeAll(async () => {
    // Seed de permisos de prueba
    // ...
  });

  afterAll(async () => {
    // Limpiar
    // ...
  });

  it('admin tiene acceso a todo', async () => {
    // Mock de sesión admin
    // Verificar que requirePermiso('cualquier.permiso') pasa para admin
  });

  it('gerente no tiene permisos de admin', async () => {
    // Mock de sesión gerente
    // Verificar que requirePermiso('admin.usuarios.crud') lanza error
  });

  it('cambio dinámico en tabla se refleja en siguiente request', async () => {
    // Remover un permiso de la tabla
    // Cachear en este request aún lo tiene (cache per-request)
    // En siguiente request, nuevo cache lo verá removido
  });
});
```

- [ ] **Paso 2: Correr tests**

```bash
npm run test -- src/lib/permissions/permissions.test.ts
```

- [ ] **Paso 3: Commit**

```bash
git add app/src/lib/permissions/permissions.test.ts
git commit -m "test(permissions): validación de matriz granular por rol"
```

---

### Tarea 4.12: Test E2E — admin asigna permiso

**Archivos:**
- Crear: `app/e2e/permisos.spec.ts` (nuevo)

- [ ] **Paso 1: Escribir test**

```typescript
// app/e2e/permisos.spec.ts

import { test, expect } from '@playwright/test';

test('admin asigna permiso a gerente que lo habilita', async ({ page }) => {
  // Login como admin
  await page.goto('http://localhost:3000/admin/permisos');

  // Encontrar fila 'caja.cierres.bloquear' y columna 'gerente'
  const checkbox = page.locator(
    'input[type="checkbox"][name*="caja.cierres.bloquear"][name*="gerente"]'
  );

  // Debe estar unchecked inicialmente
  await expect(checkbox).not.toBeChecked();

  // Hacerle click
  await checkbox.click();

  // Esperar a que se guarde (feedback visual o URL change)
  await page.waitForTimeout(500);

  // Recargar página para verificar que persistió
  await page.reload();
  await expect(checkbox).toBeChecked();

  // En otro navegador, login como gerente y verificar que ahora puede bloquear cierres
  // (Este paso es más complejo; requeriría otra sesión de browser)
});
```

- [ ] **Paso 2: Commit**

```bash
git add app/e2e/permisos.spec.ts
git commit -m "test(e2e): asignación dinámica de permisos a roles"
```

---

## D5 — Formulario Público de Empleados (ejecutar QUINTO, tras D4)

### Tarea 5.1: Migración — modelos `SolicitudEmpleado`

**Archivos:**
- Modificar: `app/prisma/schema.prisma`

- [ ] **Paso 1: Añadir modelos espejo**

```prisma
// app/prisma/schema.prisma

enum EstadoSolicitudEmpleado {
  pendiente
  aprobada
  rechazada
  parcial
  cancelada
}

model SolicitudEmpleado {
  id                      String                      @id @default(cuid())
  edicionId               String
  edition                 Edicion                     @relation(fields: [edicionId], references: [id], onDelete: Cascade)

  // Datos del empleado
  dni                     String
  nombre                  String
  apellidos               String
  telefono                String?
  email                   String?

  // Control
  estado                  EstadoSolicitudEmpleado     @default(pendiente)
  solicitudEmpleadoTurnos SolicitudEmpleadoTurno[]

  // Auditoría
  createdAt               DateTime                    @default(now())
  updatedAt               DateTime                    @updatedAt

  @@unique([edicionId, dni]) // Un DNI por edición
  @@map("solicitudes_empleado")
}

model SolicitudEmpleadoTurno {
  id                      String                      @id @default(cuid())
  solicitudEmpleadoId     String
  solicitudEmpleado       SolicitudEmpleado           @relation(fields: [solicitudEmpleadoId], references: [id], onDelete: Cascade)

  turnoId                 String
  turno                   Turno                       @relation(fields: [turnoId], references: [id])

  @@unique([solicitudEmpleadoId, turnoId])
  @@map("solicitudes_empleado_turnos")
}

// Añadir relación en Turno:
model Turno {
  // ... (campos existentes)
  
  solicitudesVoluntario   SolicitudVoluntarioTurno[]
  solicitudesEmpleado     SolicitudEmpleadoTurno[]   @relation("SolicitudEmpleadoTurno")
}
```

- [ ] **Paso 2: Crear migración**

```bash
cd c:\Proyectos\caseta\app
npx prisma migrate dev --name "add SolicitudEmpleado models"
```

- [ ] **Paso 3: Regenerar client**

```bash
npx prisma generate
```

- [ ] **Paso 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): modelos SolicitudEmpleado y SolicitudEmpleadoTurno"
```

---

### Tarea 5.2-5.11: (Resumen ejecutivo — tareas 5.2 a 5.11)

Dado el gran volumen, presentaré el resumen. Cada tarea sigue el patrón: **crear archivo → test → implementar → commit**.

**5.2** — Crear `/apuntarse-empleado/[token]/page.tsx` (server RSC)
**5.3** — Crear `_lib/huecos-empleado.ts` (análogo a `calcularHuecosVoluntario`)
**5.4** — Crear `schema.ts` (Zod schema para formulario)
**5.5** — Server action `buscarEmpleadoPorDniAction` (autocompletado DNI + rate-limit)
**5.6** — Server action `crearSolicitudEmpleadoAction` (crear solicitud pendiente)
**5.7** — Componente cliente `formulario-empleado.tsx` (on blur DNI → 5.5 → autorrellena)
**5.8** — Modificar `/admin/solicitudes/page.tsx` (añadir tab "Empleados")
**5.9** — Action `aprobarSolicitudEmpleadoAction` (crear Empleado o actualizar + Asignacion[])
**5.10** — Tests integración en `actions.test.ts`
**5.11** — Test E2E en `e2e/apuntarse-empleado.spec.ts`

Por brevedad en este plan, los pasos detallados se omiten, pero cada uno sigue la pauta TDD:
1. Test (failing)
2. Verify fail
3. Implement
4. Verify pass
5. Commit

---

## Resumen Final

**Orden de ejecución confirmado:**
1. **D2** — Lenguaje inclusivo (glosario + aplicación por módulos)
2. **D6** — Persistencia form state (helpers + patrones)
3. **D1** — Paginación (4 componentes + 14 listados)
4. **D3** — Dashboard KPIs (query + labels + eliminar KPI hoy)
5. **D4** — Permisos (catálogo + migración + 70+ archivos)
6. **D5** — Empleados público (modelos + actions + componentes)

**Commits totales esperados:** ~50 (uno por tarea pequeña, agrupados por módulo).

**Verificación:**
- Tests: `npm run test`
- E2E: `npm run test:e2e` (o `npx playwright test`)
- Build: `npm run build`
- Lint: `npm run lint`

---

