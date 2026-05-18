# Patrón: Persistencia de valores en formularios tras validación

**Fecha**: 2026-05-18  
**Contexto**: D6.4–D6.5 — Guardar datos enviados en `ActionResult.values` para restaurarlos en cliente si hay error de validación.  
**Objetivo**: Mejorar UX en flujos con errores frecuentes (múltiples validaciones, solapamientos, etc.) evitando que el usuario reescriba.

---

## 1. Patrón canónico en Server Actions

### Estructura base

```typescript
"use server";

import { formDataToObject } from "@/lib/forms";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";

export async function miAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Capturar valores del formulario ANTES de parsear/validar
    const values = formDataToObject(formData);

    // 2. Parsear y validar con Zod
    const data = parseForm(miSchema, formData);

    // 3. Lógica de negocio
    const resultado = await prisma.algo.create({ data: {...} });

    return { ok: true, data: { id: resultado.id } };
  } catch (err) {
    // 4. En error, retornar valores capturados
    const fieldErrors = ...;
    if (fieldErrors) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Error",
        fieldErrors,
        values,  // <-- CLAVE: aquí van los valores del formulario
      };
    }
    return toActionError(err);
  }
}
```

### Ejemplo completo: crearSolicitudAction

```typescript
// ANTES (sin persistencia)
return { ok: false, error: err.message, fieldErrors };

// DESPUÉS (con persistencia)
const values = formDataToObject(formData);
return { ok: false, error: err.message, fieldErrors, values };
```

---

## 2. Patrón en componente cliente

### Forma genérica: acceso a `state?.values?.fieldName`

```tsx
"use client";

import { useActionState } from "react";

export function MiFormulario() {
  const [state, formAction, pending] = useActionState(miAction, null);

  // Restauración según tipo de input:
  return (
    <form action={formAction}>
      {/* Text input: defaultValue */}
      <Input
        name="nombre"
        defaultValue={state?.values?.nombre as string}
        placeholder="..."
      />

      {/* Email input: defaultValue */}
      <Input
        name="email"
        type="email"
        defaultValue={state?.values?.email as string}
        placeholder="..."
      />

      {/* Checkbox single: defaultChecked */}
      <input
        type="checkbox"
        name="aceptaTerminos"
        defaultChecked={(state?.values?.aceptaTerminos as string) === "on"}
      />

      {/* Checkbox multivalor: defaultChecked + Array */}
      {turnos.map((t) => (
        <input
          key={t.id}
          type="checkbox"
          name="turnoIds"
          value={t.id}
          defaultChecked={(state?.values?.turnoIds as string[])?.includes(t.id)}
        />
      ))}

      {/* Select: defaultValue */}
      <select name="entidadId" defaultValue={state?.values?.entidadId as string}>
        <option value="">Selecciona...</option>
        {entidades.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </select>

      {/* Date input: defaultValue (ISO string) */}
      <input
        type="date"
        name="fechaNacimiento"
        defaultValue={state?.values?.fechaNacimiento as string}
      />

      {/* Textarea: defaultValue */}
      <textarea
        name="observaciones"
        defaultValue={state?.values?.observaciones as string}
      />
    </form>
  );
}
```

---

## 3. Ejemplo completo: formulario con múltiples tipos

```tsx
// actions.ts
"use server";

import { formDataToObject } from "@/lib/forms";
import { parseForm, toActionError, type ActionResult } from "@/lib/action-result";

export async function registrarVoluntarioAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const values = formDataToObject(formData);
    const data = parseForm(registroSchema, formData);

    const registro = await prisma.voluntario.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        turnos: { createMany: { data: data.turnoIds.map(id => ({ turnoId: id })) } },
      },
      select: { id: true },
    });

    return { ok: true, data: { id: registro.id } };
  } catch (err) {
    const fieldErrors = extractFieldErrors(err);
    if (fieldErrors) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Error",
        fieldErrors,
        values: formDataToObject(formData), // <-- Capturar siempre
      };
    }
    return toActionError(err);
  }
}

// _components/formulario.tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/app/(app)/admin/_components/page-header";

export function RegistroVoluntario() {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(registrarVoluntarioAction, null);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction}>
      {/* Nombre: text input */}
      <div>
        <label htmlFor="nombre">Nombre</label>
        <Input
          id="nombre"
          name="nombre"
          required
          defaultValue={state?.values?.nombre as string}
        />
        <FieldError messages={errors.nombre} />
      </div>

      {/* Email: email input */}
      <div>
        <label htmlFor="email">Email</label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={state?.values?.email as string}
        />
        <FieldError messages={errors.email} />
      </div>

      {/* Turnos: checkbox multivalor */}
      <fieldset>
        <legend>Turnos disponibles</legend>
        <div>
          {turnos.map((t) => (
            <label key={t.id}>
              <input
                type="checkbox"
                name="turnoIds"
                value={t.id}
                defaultChecked={(state?.values?.turnoIds as string[])?.includes(t.id)}
              />
              <span>{t.rango}</span>
            </label>
          ))}
        </div>
        <FieldError messages={errors.turnoIds} />
      </fieldset>

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Registrarme"}
      </Button>
    </form>
  );
}
```

---

## 4. Consideraciones de seguridad

### Blacklist de campos sensibles

El helper `formDataToObject()` **ya filtra automáticamente**:
- `password`, `passwordConfirm`, `passwordNueva`, `passwordNuevaConfirm`, `passwordActual`
- `token`
- Campos técnicos con prefix `_` (parseForm los filtra también)

**No exponer jamás en `values`:**
```typescript
// ❌ NO HACER — expone contraseña en cliente
return { ok: false, error: "Contraseña corta", values: formDataToObject(formData) };

// ✅ HACER — formDataToObject filtra automáticamente
const values = formDataToObject(formData); // password ya no está
```

### Exclusiones por dominio

Si un campo sensible no está en la blacklist estándar, usar la opción `excludeFields`:

```typescript
const values = formDataToObject(formData, {
  excludeFields: ["nif", "creditCard"],
});
```

### PII y datos personales

Aunque `formDataToObject()` no los filtra automáticamente (nombre, email, teléfono sí se guardan), tener presente:
- Estos datos se envían a través del `state` en el cliente de forma **legible**
- La intención es **restaurar el formulario** tras error, no guardarlos en localStorage/cookies
- Si el usuario cancela, los datos desaparecen al refrescar (salvo que los conserve JavaScript en memoria)
- **No persistir `values` en localStorage sin consentimiento explícito**

---

## 5. Checklist de aplicación

Para cada formulario a actualizar:

- [ ] **Action**: `const values = formDataToObject(formData)` al inicio
- [ ] **Error path**: `return { ..., values }` en el catch con `fieldErrors`
- [ ] **Componente cliente**: `defaultValue={state?.values?.fieldName as string}` en inputs de texto
- [ ] **Componente cliente**: `defaultChecked={(state?.values?.checkboxes as string[])?.includes(id)}` en checkboxes multivalor
- [ ] **Componente cliente**: `defaultValue={state?.values?.select as string}` en select
- [ ] **Testing**: Enviar formulario con error, verificar que los valores persisten
- [ ] **Edge case — checkbox single**: `defaultChecked={(state?.values?.fieldName as string) === "on"}`

---

## 6. Impacto esperado

- **UX mejora**: Usuarios no tienen que reescribir tras error de validación
- **Performance**: Cero overhead — `formDataToObject()` es O(n) en claves
- **Seguridad**: Mantenida — no hay almacenamiento persistente, solo `state` transitorio
- **Scope**: 34 formularios a actualizar (iniciar por los más críticos: solicitudes, cierres, asignaciones)

---

## Referencias

- **Helper**: [`app/src/lib/forms.ts`](/c/Proyectos/caseta/app/src/lib/forms.ts)
- **ActionResult type**: [`app/src/lib/action-result.ts`](/c/Proyectos/caseta/app/src/lib/action-result.ts)
- **Ejemplo 1 (D6.5)**: [`app/src/app/apuntarse/[token]/actions.ts`](/c/Proyectos/caseta/app/src/app/apuntarse/[token]/actions.ts)
- **Ejemplo 2 (D6.5)**: [`app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx`](/c/Proyectos/caseta/app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx)
