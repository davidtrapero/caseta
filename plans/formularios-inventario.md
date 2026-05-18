# Inventario de Formularios — Proyecto Caseta

**Generado**: 2026-05-18  
**Total**: 34 formularios encontrados (incluyendo diálogos modales y páginas de edición con formularios)  
**Áreas**: Admin, Turnos, Caja, Inventario, Cuenta, Autorización

---

## Por Módulo

### Admin (13 formularios)

| Nombre | Ruta | Componente | Inputs |
|---|---|---|---|
| **Usuario** | `/admin/usuarios/[id]`, `/admin/usuarios/nuevo` | `usuario-form.tsx` | email (text, readOnly en edición), name (text), password (password, solo crear), rol (select), activo (checkbox) |
| **Caseta** | `/admin/casetas/[id]`, `/admin/casetas/nueva` | `caseta-form.tsx` | nombre (text), activa (checkbox) |
| **Edición** | `/admin/ediciones/[id]`, `/admin/ediciones/nueva` | `edicion-form.tsx` | nombre (text), año (number), edicionVigente (checkbox) |
| **Entidad** | `/admin/entidades/_components` | `entidad-form.tsx` | nombre (text) |
| **Proveedor** | `/admin/proveedores/[id]`, `/admin/proveedores/nuevo` | `proveedor-form.tsx` | nombre (text), contacto (text), activo (checkbox) |
| **Tipo Empleado** | `/admin/tipos-empleado/[id]`, `/admin/tipos-empleado/nuevo` | `tipo-empleado-form.tsx` | label (text), color (select o colorpicker), orden (number) |
| **Publicar Edición** | `/admin/ediciones/[id]` | `publicar-formulario.tsx` | — (toggle/submit simple) |
| **Toggle Activa (Edición)** | `/admin/ediciones/[id]` | `toggle-activa.tsx` | edicionVigente (checkbox/toggle) |
| **Toggle Activa (Caseta)** | `/admin/casetas/[id]` | `toggle-activa.tsx` | activa (checkbox/toggle) |
| **Toggle Activo (Proveedor)** | `/admin/proveedores/[id]` | `toggle-activo.tsx` | activo (checkbox/toggle) |
| **Toggle Activo (Usuario)** | `/admin/usuarios/[id]` | `toggle-activo.tsx` | activo (checkbox/toggle) |
| **Dialog Resetear Password** | `/admin/usuarios/[id]` | `DialogoResetearPassword.tsx` | — (botón submit simple) |
| **Rellenar Plazas** | `/admin/mantenimiento` | `DialogoRellenarPlazas.tsx` | — (lógica modal) |

### Caja (3 formularios)

| Nombre | Ruta | Componente | Inputs |
|---|---|---|---|
| **Cierre** | `/caja/cierres/[id]`, `/caja/cierres/nuevo` | `cierre-form.tsx` | casetaId (select), fecha (date), ingresosTotales (number, step 0.01), notas (textarea) |
| **Gasto** | `/caja/gastos/[id]`, `/caja/gastos/nuevo` | `gasto-form.tsx` | casetaId (select), fecha (date), concepto (text), cantidad (number, step 0.01), notas (textarea) |
| **Acciones Cierre** | `/caja/cierres/[id]` | `acciones-cierre.tsx` | — (botones de acción: bloquear, aprobar) |

### Turnos (4 formularios/diálogos)

| Nombre | Ruta | Componente | Inputs |
|---|---|---|---|
| **Asignar Empleado** | `/turnos/semana`, `/turnos/asistencias` | `AsignarEmpleado.tsx` | turnoId (hidden), empleadoId (hidden), tipoImputadoId (hidden), búsqueda (text input, client-side) |
| **Diálogo Nuevo Turno** | `/turnos/semana` | `DialogoNuevoTurno.tsx` | — (probablemente fecha, casetaId, etc.) |
| **Diálogo Editar Turno** | `/turnos/semana` | `DialogoEditarTurno.tsx` | turnoId (hidden, actualizar), fechas y tipos |
| **Duplicar Día** | `/turnos/semana` | `DialogoDuplicarDia.tsx` | fechaOrigen (date), fechaDestino (date) |
| **Duplicar Semana** | `/turnos/semana` | `BotonDuplicarSemana.tsx` | fechaOrigen (date range), fechaDestino (date range) |
| **Asignar Empleado Modal** | `/turnos/[id]` | `AsignarEmpleado.tsx` (reutilizable) | búsqueda + submit (hidden fields) |

### Inventario (3 formularios)

| Nombre | Ruta | Componente | Inputs |
|---|---|---|---|
| **Producto** | `/inventario/productos/[id]`, `/inventario/productos/nuevo` | `producto-form.tsx` | nombre (text), precioUnitario (number, step 0.01), activo (checkbox) |
| **Pedido** | `/inventario/pedidos/[id]`, `/inventario/pedidos/nuevo` | `pedido-form.tsx` | casetaId (select), estado (select), lineItems[] (nested: productoId, cantidad) |
| **Ajustar Stock Modal** | `/inventario/stock` | `ajustar-stock-modal.tsx` | productoId (hidden), cantidad (number, delta), razon (select o text) |

### Cuenta (2 formularios)

| Nombre | Ruta | Componente | Inputs |
|---|---|---|---|
| **Cambiar Password** | `/cuenta/password` | `FormCambiarPassword.tsx` | passwordActual (password), passwordNueva (password), passwordNuevaConfirm (password) |
| **Password Inicial** | `/cuenta/password-inicial` | `FormPasswordInicial.tsx` | passwordNueva (password), passwordNuevaConfirm (password) |

### Autorización / Público (1 formulario)

| Nombre | Ruta | Componente | Inputs |
|---|---|---|---|
| **Voluntario** | `/apuntarse/[token]` | `formulario-voluntario.tsx` | nombre (text), email (email), teléfono (tel), turnos[] (checkboxes multiples), fichero avales (file upload) |

### Login (1 formulario)

| Nombre | Ruta | Componente | Inputs |
|---|---|---|---|
| **Login** | `/login` | `login-form.tsx` | email (email), password (password) |

### Ajustes (1 formulario)

| Nombre | Ruta | Componente | Inputs |
|---|---|---|---|
| **Editor Plantilla** | `/admin/ajustes` | `EditorPlantilla.tsx` | template (textarea/code editor) |

---

## Tipos de Inputs Utilizados (Aggregated)

| Tipo | Ejemplos | Frecuencia |
|---|---|---|
| **text** | email, name, contacto, label, concepto, búsqueda | ~15 |
| **select/dropdown** | rol, casetaId, estado, tipoEmpleadoId | ~12 |
| **number** | ingresosTotales, cantidad, precioUnitario, orden, step 0.01 | ~8 |
| **date** | fecha, fechaOrigen, fechaDestino | ~6 |
| **checkbox** | activo, activa, edicionVigente, términos | ~8 |
| **password** | passwordActual, passwordNueva, passwordNuevaConfirm | ~4 |
| **textarea** | notas, observaciones, template | ~4 |
| **hidden** | _id, turnoId, empleadoId, tipoImputadoId | ~6 (técnicos) |
| **email** | email, email voluntario | ~3 |
| **tel** | teléfono | ~1 |
| **file** | fichero avales | ~1 |

---

## Patrones Detectados

### ActionResult + useActionState
Todos los formularios siguen:
```typescript
const [state, formAction, pending] = useActionState<ActionResult<T> | null, FormData>(action, null);
```

### FieldErrors handling
```typescript
const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
// Renderizado: <FieldError messages={errors.fieldName} />
```

### Casos especiales

1. **Multivalor (checkboxes)**: `turnos[]`, `tipoEmpleadoIds[]` — parseForm ya agrupa con `formData.getAll(key)`
2. **Hidden fields**: `_id` (edición), `turnoId`, `empleadoId`, `tipoImputadoId` — filtrados por prefix `_` en parseForm
3. **Nested objects**: `lineItems[]` en pedidos — requiere schema Zod anidado
4. **File uploads**: `formulario-voluntario.tsx` — fichero avales exclusivo
5. **Búsquedas client-side**: `AsignarEmpleado.tsx` — no es formulario Submit, es popover interactivo
6. **Toggles/acciones simples**: `toggle-activa.tsx`, `acciones-cierre.tsx` — botones submit sin payload o con payload mínimo

---

## Validación Actual (Zod)

Todos los formularios validan con Zod **en el Server Action**, usando `parseForm<T>(schema, formData)`:
- No hay frontend validation más allá de HTML5 (required, type, min, max)
- Backend `toActionError()` mapea ZodError → fieldErrors

---

## Recomendación: ActionResult + formDataToObject

1. **Extender ActionResult** con `values?: Record<string, unknown>` para permitir persistencia de entrada
2. **Crear `formDataToObject(formData)`** helper que:
   - Excluya blacklist (password, passwordConfirm, token)
   - Agrupe multivalor en arrays
   - Excluya File instances
   - Retorne `Record<string, unknown>` tipo-agnóstica
3. **Usar en Server Actions** para capturar valores previos antes de fallar Zod

---

## Testing (Nuevas tests para formDataToObject)

Casos a cubrir:
- ✓ Formulario simple (nombre, email)
- ✓ Multivalor (turnos[] → array)
- ✓ Blacklist (password, passwordConfirm excluidas)
- ✓ File instances (excluidas)
- ✓ Valores vacíos (string vacío → undefined)
- ✓ Hidden fields (preservados: _id, turnoId, etc.)
