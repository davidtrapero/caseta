# Glosario inclusivo — propuesta D2.1

> Estado: **PENDIENTE DE APROBACIÓN** — no aplicar cambios hasta que el usuario marque las entradas como OK.
>
> Estrategia acordada: colectivo/neutro donde sea natural; desdoble solo donde sea más claro.
> Los identificadores de código (variables, props, slugs de BD) NO se cambian — solo strings visibles al usuario.

---

## Cómo revisar este documento

Cada entrada tiene una casilla `[ ]`. Marca `[x]` para aprobar la sustitución, `[~]` para ajustar el texto propuesto, o deja `[ ]` para descartarla. Cuando termines, comunica el veredicto y se lanzará la fase D2.2.

---

## Módulo: Empleados (`app/src/app/(app)/empleados/`)

### E1 — Título de página y botón de acción

- **Archivo:** `empleados/page.tsx` líneas 92, 95, 110, 114–117
- **Texto actual:**
  - `title="Empleados"`
  - `actionLabel="Nuevo empleado"`
  - `description="Ningún empleado coincide con los filtros aplicados. Prueba a limpiar la búsqueda."`
  - `title="Sin empleados registrados"`
  - `description="Registra empleados para poder asignarles turnos y calcular nóminas."`
  - `actionLabel={puedeEditar ? "Crear empleado" : undefined}`
- **Propuesta:**
  - `title="Personal"` _(colectivo neutro)_
  - `actionLabel="Añadir persona"` _(o "Nuevo registro" si se prefiere distancia)_
  - `description="Ninguna persona coincide con los filtros aplicados. Prueba a limpiar la búsqueda."`
  - `title="Sin personal registrado"`
  - `description="Registra el personal para poder asignarle turnos y calcular nóminas."`
  - `actionLabel={puedeEditar ? "Añadir persona" : undefined}`
- **Rationale:** "Empleados" como título de sección se convierte en "Personal" (epiceno colectivo). Los CTA usan "persona" para el alta individual.
- **Aprobación:** `[ ]`

---

### E2 — Página de alta

- **Archivo:** `empleados/nuevo/page.tsx` líneas 39–40
- **Texto actual:**
  - `title="Nuevo empleado"`
  - `subtitle="Dejar el jornal vacío si es voluntario."`
- **Propuesta:**
  - `title="Nueva persona"`
  - `subtitle="Deja el jornal vacío si participa como voluntariado."`
- **Rationale:** "Nuevo" queda sustituido por género neutro; "voluntario" → "voluntariado" (epiceno).
- **Aprobación:** `[ ]`

---

### E3 — Mensajes de validación (actions)

- **Archivo:** `empleados/actions.ts` líneas 43, 50–51, 57–58, 64–65, 72, 230
- **Texto actual:**
  - L43: `"Uno o más tipos de empleado no válidos o inactivos."`
  - L50: `"Los voluntarios no pueden tener jornal asignado."`
  - L51 (fieldError): `"Deja este campo vacío para voluntarios."`
  - L57: `"Los voluntarios requieren una entidad."`
  - L58 (fieldError): `"Selecciona una entidad para voluntarios."`
  - L64: `"Los voluntarios requieren teléfono."`
  - L65 (fieldError): `"Proporciona un teléfono para voluntarios."`
  - L72: `"El jornal diario es obligatorio para no-voluntarios."`
  - L230: `"Empleado no encontrado."`
- **Propuesta:**
  - L43: `"Uno o más categorías de personal no son válidas o están inactivas."`
  - L50: `"El voluntariado no puede tener jornal asignado."`
  - L51: `"Deja este campo vacío para el voluntariado."`
  - L57: `"El voluntariado requiere una entidad."`
  - L58: `"Selecciona una entidad para el voluntariado."`
  - L64: `"El voluntariado requiere teléfono."`
  - L65: `"Proporciona un teléfono para el voluntariado."`
  - L72: `"El jornal diario es obligatorio para personal contratado."`
  - L230: `"Persona no encontrada."`
- **Rationale:** "los voluntarios" → "el voluntariado" (artículo singular colectivo, epiceno). "no-voluntarios" → "personal contratado" (específico y neutro). "Empleado no encontrado" → "Persona no encontrada" (femenino genérico válido o podría ser neutro).
- **Aprobación:** `[ ]`

---

### E4 — Formulario de empleado (hints y placeholders)

- **Archivo:** `empleados/_components/empleado-form.tsx` líneas 276, 280–281
- **Texto actual:**
  - L276: `placeholder={esVoluntario ? "No aplica (voluntario)" : "80.00"}`
  - L280: `"Los voluntarios no cobran jornal."`
  - L281: `"Dejar vacío si es voluntario (selecciona el tipo Voluntario)."`
- **Propuesta:**
  - L276: `placeholder={esVoluntario ? "No aplica (voluntariado)" : "80.00"}`
  - L280: `"El voluntariado no cobra jornal."`
  - L281: `"Dejar vacío para voluntariado (selecciona el tipo Voluntario)."`
- **Aprobación:** `[ ]`

---

## Módulo: Turnos (`app/src/app/(app)/turnos/`)

### T1 — ROL_LABEL en semana/page.tsx

- **Archivo:** `turnos/semana/page.tsx` líneas 58–60
- **Texto actual:**
  ```
  coordinadores: { singular: "Coordinador", plural: "Coordinadores" },
  trabajadores: { singular: "Personal contratado", plural: "Personal contratado" },
  voluntarios: { singular: "Persona voluntaria", plural: "Personas voluntarias" },
  ```
- **Propuesta:**
  ```
  coordinadores: { singular: "Coordinación", plural: "Coordinación" },
  trabajadores: { singular: "Personal contratado", plural: "Personal contratado" },
  voluntarios: { singular: "Persona voluntaria", plural: "Personas voluntarias" },
  ```
- **Rationale:** "Coordinador/Coordinadores" → "Coordinación" (colectivo, ya neutro en singular y plural). Las otras dos entradas ya están en neutro inclusivo — no requieren cambio. La clave JS `trabajadores` y `coordinadores` se mantiene (identificador interno).
- **Aprobación:** `[ ]`

---

### T2 — ROL_LABEL en exportar/semana/page.tsx

- **Archivo:** `turnos/exportar/semana/page.tsx` líneas 26–28
- **Texto actual:**
  ```
  { key: "coordinadores", singular: "Coordinador", plural: "Coordinadores" },
  { key: "trabajadores", singular: "Personal contratado", plural: "Personal contratado" },
  { key: "voluntarios", singular: "Persona voluntaria", plural: "Personas voluntarias", slug: "grupo-rol-vol" },
  ```
- **Propuesta:** Mismo que T1 — cambiar `"Coordinador"/"Coordinadores"` → `"Coordinación"/"Coordinación"`.
- **Aprobación:** `[ ]`

---

### T3 — imprimir/page.tsx etiquetas de grupo

- **Archivo:** `turnos/imprimir/page.tsx` líneas 118–119
- **Texto actual:**
  ```
  grupos.coordinadores.length === 1 ? "Coordinador" : "Coordinadores"
  ```
- **Propuesta:**
  ```
  "Coordinación"
  ```
  _(Singular/plural innecesario si se usa colectivo)_
- **Aprobación:** `[ ]`

---

### T4 — Cabeceras de tabla en exportar y imprimir

- **Archivos:**
  - `turnos/exportar/dia/page.tsx` L66: `<th>Empleados</th>`
  - `turnos/imprimir/page.tsx` L85: `<th>Empleados y asistencia</th>`
- **Propuesta:**
  - L66: `<th>Personal</th>`
  - L85: `<th>Personal y asistencia</th>`
- **Aprobación:** `[ ]`

---

### T5 — DialogoNuevoTurno: subtítulo y label de asignación

- **Archivo:** `turnos/_components/DialogoNuevoTurno.tsx` línea 218
- **Texto actual:** `"Puedes crear el turno sin empleados y asignarlos después."`
- **Propuesta:** `"Puedes crear el turno sin personal asignado y añadirlo después."`
- **Aprobación:** `[ ]`

---

### T6 — Mensaje de error de solape (actions)

- **Archivo:** `turnos/actions.ts` L180
- **Texto actual:** `"El personal no tiene tipo asignado."`
- **Nota:** Esta cadena ya usa "personal" — ya es inclusiva. **Sin cambio necesario.**

---

### T7 — Asistencias: subtítulo

- **Archivo:** `turnos/asistencias/page.tsx` L106
- **Texto actual:** `subtitle="Empleados que han asistido a turnos. Filtros aplican a página y exportación."`
- **Propuesta:** `subtitle="Personal que ha asistido a turnos. Filtros aplican a página y exportación."`
- **Aprobación:** `[ ]`

---

## Módulo: Admin — Solicitudes (`app/src/app/(app)/admin/solicitudes/`)

### AS1 — Subtítulo de página

- **Archivo:** `admin/solicitudes/page.tsx` L77
- **Texto actual:** `subtitle="Solicitudes de voluntarios y empleados pendientes de revisión."`
- **Propuesta:** `subtitle="Solicitudes de voluntariado y personal pendientes de revisión."`
- **Aprobación:** `[ ]`

---

### AS2 — Mensajes de error en actions

- **Archivo:** `admin/solicitudes/actions.ts`
- **Texto actual:**
  - L97: `"No hay un tipo de empleado marcado como voluntario."`
  - L204: `"Solape con otros turnos del empleado. Revisa antes de aprobar."`
  - L464: `"No hay un tipo de empleado contratado activo configurado."`
  - L476: `"El empleado asociado está desactivado."`
  - L536: `"Solape con otros turnos del empleado. Revisa antes de aprobar."`
  - L661: `"No hay un tipo de empleado contratado activo configurado."`
  - L674: `"El empleado registrado con este DNI es voluntario. No se puede aprobar como contratado."`
  - L761: `"Solape con otros turnos del empleado. Revisa antes de aprobar."`
- **Propuesta:**
  - L97: `"No hay ninguna categoría marcada como voluntariado."`
  - L204/536/761: `"Hay solapamiento con otros turnos de esta persona. Revisa antes de aprobar."`
  - L464/661: `"No hay ninguna categoría de personal contratado activa configurada."`
  - L476: `"La persona asociada está desactivada."`
  - L674: `"La persona registrada con este DNI pertenece al voluntariado. No se puede aprobar como contratada."`
- **Rationale:** Eliminar el artículo masculino "El empleado" → "La persona" / "esta persona". "del empleado" → "de esta persona".
- **Aprobación:** `[ ]`

---

## Módulo: Admin — Tipos de empleado (`app/src/app/(app)/admin/tipos-empleado/`)

### ATE1 — Títulos y subtítulos de página

- **Archivo:** `admin/tipos-empleado/page.tsx` líneas 61–62, 76–77
- **Texto actual:**
  - `title="Tipos de empleado"`
  - `subtitle="Categorías editables (con color propio) que se aplican a empleados y plazas de turno."`
  - `title="Sin tipos de empleado"` _(en empty state)_
  - `description="Define los tipos (camarero, coordinador, voluntario…) y sus colores."`
- **Propuesta:**
  - `title="Tipos de personal"`
  - `subtitle="Categorías editables (con color propio) que se aplican al personal y las plazas de turno."`
  - `title="Sin tipos de personal"`
  - `description="Define las categorías (camarera/o, coordinación, voluntariado…) y sus colores."`
- **Rationale:** "camarero" en el ejemplo es masculino genérico; se puede desdoblar o usar categoría neutral.
- **Aprobación:** `[ ]`

---

### ATE2 — Página de nuevo tipo y edición

- **Archivo:** `admin/tipos-empleado/nuevo/page.tsx` L9–10; `admin/tipos-empleado/[id]/page.tsx` L26
- **Texto actual:**
  - `title="Nuevo tipo de empleado"`
  - `subtitle="Categoría con color propio para empleados y plazas de turno."`
  - `subtitle="Los cambios afectan a empleados y plazas que usen este tipo."`
- **Propuesta:**
  - `title="Nueva categoría de personal"`
  - `subtitle="Categoría con color propio para el personal y las plazas de turno."`
  - `subtitle="Los cambios afectan al personal y las plazas que usen esta categoría."`
- **Aprobación:** `[ ]`

---

### ATE3 — Formulario de tipo de empleado

- **Archivo:** `admin/tipos-empleado/_components/tipo-empleado-form.tsx` L212
- **Texto actual:** `"Es tipo de voluntario (sin jornal, requiere entidad asignada)."`
- **Propuesta:** `"Es categoría de voluntariado (sin jornal, requiere entidad asignada)."`
- **Aprobación:** `[ ]`

---

### ATE4 — Formulario de tipo de empleado: toggle activo

- **Archivo:** `admin/tipos-empleado/_components/tipo-empleado-form.tsx` L224
- **Texto actual:** `"Tipo activo (disponible para asignar a empleados y plazas)."`
- **Propuesta:** `"Categoría activa (disponible para asignar al personal y las plazas)."`
- **Aprobación:** `[ ]`

---

### ATE5 — Error de borrado de tipo en uso

- **Archivo:** `admin/tipos-empleado/actions.ts` L114, L130
- **Texto actual:**
  - L114: `"El tipo de empleado no existe."`
  - L130: `"Este tipo está en uso por empleados o plazas y no se puede borrar. Se ha marcado como inactivo."`
- **Propuesta:**
  - L114: `"La categoría de personal no existe."`
  - L130: `"Esta categoría está en uso por el personal o las plazas y no se puede borrar. Se ha marcado como inactiva."`
- **Aprobación:** `[ ]`

---

## Módulo: Admin — Usuarios (`app/src/app/(app)/admin/usuarios/`)

### AU1 — Subtítulo de la página de usuarios

- **Archivo:** `admin/usuarios/page.tsx` L76
- **Texto actual:** `subtitle="Cuentas con acceso a la aplicación. Los empleados de caseta no son usuarios."`
- **Propuesta:** `subtitle="Cuentas con acceso a la aplicación. El personal de caseta no tiene cuenta de acceso."`
- **Aprobación:** `[ ]`

---

### AU2 — Error de creación de usuario

- **Archivo:** `admin/usuarios/actions.ts` L57, L124, L186
- **Texto actual:**
  - L57: `"No se pudo crear el usuario."`
  - L124: `"No se puede: dejaría el sistema sin ningún administrador activo."`
  - L186: `"No se puede: dejaría el sistema sin ningún administrador activo."`
- **Propuesta:**
  - L57: `"No se pudo crear la cuenta."`
  - L124/186: `"No se puede: dejaría el sistema sin ninguna persona administradora activa."`
- **Rationale:** "usuario" → "cuenta" (objeto, no persona; más neutro). "ningún administrador" → "ninguna persona administradora" (sustantivo explícito).
- **Aprobación:** `[ ]`

---

### AU3 — Toggle de estado: tooltip

- **Archivos:**
  - `admin/ediciones/_components/toggle-activa.tsx` L22
  - `admin/usuarios/_components/toggle-activo.tsx` L42
- **Texto actual:** `"Solo un administrador puede cambiar este estado"`
- **Propuesta:** `"Solo la administración puede cambiar este estado"`
- **Aprobación:** `[ ]`

---

### AU4 — Etiqueta "Usuario desactivado" (authz)

- **Archivo:** `lib/authz.ts` L39, L82
- **Texto actual:** `throw new AuthError("Usuario desactivado", "inactive")`
- **Propuesta:** `throw new AuthError("Cuenta desactivada", "inactive")`
- **Rationale:** El error `AuthError` es interno pero puede mostrarse al usuario final. "Usuario" → "Cuenta" elimina la referencia de género.
- **Aprobación:** `[ ]`

---

## Módulo: Login (`app/src/app/login/`)

### L1 — Mensaje de cuenta desactivada

- **Archivo:** `login/login-form.tsx` L35
- **Texto actual:** `"Esta cuenta ha sido desactivada. Contacta con el administrador."`
- **Propuesta:** `"Esta cuenta ha sido desactivada. Contacta con la administración."`
- **Rationale:** "el administrador" (masculino) → "la administración" (colectivo, neutro).
- **Aprobación:** `[ ]`

---

## Módulo: Caja — Nóminas (`app/src/app/(app)/caja/nominas/`)

### CN1 — Subtítulo de nóminas

- **Archivo:** `caja/nominas/page.tsx` L139
- **Texto actual:** `"Pulsa 'Calcular nóminas' para generar las nóminas de los empleados con asistencia registrada."`
- **Propuesta:** `"Pulsa 'Calcular nóminas' para generar las nóminas del personal con asistencia registrada."`
- **Aprobación:** `[ ]`

---

## Módulo: Voluntariado — Formulario público (`app/src/app/apuntarse/`)

### V1 — Título del formulario público

- **Archivo:** `apuntarse/[token]/page.tsx` L93
- **Texto actual:** `<h1 className="text-2xl font-semibold">Apuntarse como voluntario</h1>`
- **Propuesta:** `<h1 className="text-2xl font-semibold">Apuntarse como voluntaria/o</h1>`
- **Alternativa más elegante:** `<h1 className="text-2xl font-semibold">Formulario de voluntariado</h1>`
- **Rationale:** El formulario es público y de cara a personas externas. "voluntariado" (epiceno) o desdoble son ambas válidas.
- **Aprobación:** `[ ]`

---

### V2 — Asunto de aviso de rechazo

- **Archivo:** `lib/voluntario-aviso.ts` L20
- **Texto actual:** `const ASUNTO_FALLBACK = "Tu solicitud de voluntario"`
- **Propuesta:** `const ASUNTO_FALLBACK = "Tu solicitud de voluntariado"`
- **Aprobación:** `[ ]`

---

### V3 — Subtítulo en ajustes de mensajes de rechazo

- **Archivo:** `admin/ajustes/page.tsx` L20
- **Texto actual:** `subtitle="Edita los textos enviados a voluntarios al rechazar turnos. Variables disponibles: {nombre}, {motivo}, {turnos}, {caseta}, {fechas}."`
- **Propuesta:** `subtitle="Edita los textos enviados al voluntariado al rechazar turnos. Variables disponibles: {nombre}, {motivo}, {turnos}, {caseta}, {fechas}."`
- **Aprobación:** `[ ]`

---

## Módulo: Admin — Entidades (`app/src/app/(app)/admin/entidades/`)

### AE1 — Subtítulo de entidades

- **Archivo:** `admin/entidades/page.tsx` L65
- **Texto actual:** `subtitle="Hermandades, peñas o agrupaciones a las que pertenecen las personas voluntarias. Las inactivas no aparecen en el formulario público pero conservan sus referencias."`
- **Nota:** Esta cadena ya usa "personas voluntarias" — ya es inclusiva. **Sin cambio necesario.**

---

## Módulo: Admin — Casetas (`app/src/app/(app)/admin/casetas/`)

### AC1 — Hint de caseta por defecto al crear empleado

- **Archivo:** `admin/casetas/_components/caseta-form.tsx` L99
- **Texto actual:** `"Se precargará al crear un empleado desde esta caseta."`
- **Propuesta:** `"Se precargará al registrar personal desde esta caseta."`
- **Aprobación:** `[ ]`

---

## Módulo: Sidebar / Navegación (`app/src/app/(app)/layout.tsx`)

### NAV1 — Label del sidebar

- **Archivo:** `app/(app)/layout.tsx` L17
- **Texto actual:** `{ href: "/empleados", label: "Empleados", roles: ["admin", "gerente"] }`
- **Propuesta:** `{ href: "/empleados", label: "Personal", roles: ["admin", "gerente"] }`
- **Rationale:** El label visible en navegación debe coincidir con el título de la sección (E1).
- **Aprobación:** `[ ]`

---

### NAV2 — Label del admin layout

- **Archivo:** `app/(app)/admin/layout.tsx` L7
- **Texto actual:** `{ href: "/admin/tipos-empleado", label: "Tipos de empleado" }`
- **Propuesta:** `{ href: "/admin/tipos-empleado", label: "Tipos de personal" }`
- **Aprobación:** `[ ]`

---

## Módulo: Dashboard (`app/src/app/(app)/_lib/dashboard.ts`)

### D1 — Alerta de solicitudes pendientes

- **Archivo:** `_lib/dashboard.ts` L254
- **Texto actual:** `` `${n} solicitud${...} de voluntario${...} pendiente${...}` ``
- **Propuesta:** `` `${n} solicitud${...} de voluntariado pendiente${...}` ``
- **Rationale:** "de voluntario/s" → "de voluntariado" (invariable en número, epiceno).
- **Aprobación:** `[ ]`

---

## Módulo: Mantenimiento (`app/src/app/(app)/admin/mantenimiento/`)

### M1 — Chip de voluntario en diálogo de plazas

- **Archivo:** `admin/mantenimiento/_components/DialogoRellenarPlazas.tsx` L174
- **Texto actual:** `{t.esVoluntario ? " (voluntario)" : ""}`
- **Propuesta:** `{t.esVoluntario ? " (voluntariado)" : ""}`
- **Aprobación:** `[ ]`

---

## Resumen de hallazgos

| Módulo | Entradas | Sin cambio (ya OK) |
|---|---|---|
| Empleados | E1, E2, E3, E4 | — |
| Turnos | T1, T2, T3, T4, T5, T7 | T6 |
| Admin Solicitudes | AS1, AS2 | — |
| Admin Tipos empleado | ATE1–ATE5 | — |
| Admin Usuarios | AU1, AU2, AU3, AU4 | — |
| Login | L1 | — |
| Caja Nóminas | CN1 | — |
| Voluntariado (público) | V1, V2, V3 | — |
| Admin Entidades | — | AE1 |
| Admin Casetas | AC1 | — |
| Sidebar/Nav | NAV1, NAV2 | — |
| Dashboard | D1 | — |
| Mantenimiento | M1 | — |

**Total entradas a cambiar: 28**
**Cadenas individuales afectadas: ~45**
**Cadenas ya inclusivas (sin cambio): 3**

---

## Términos consolidados (glosario de referencia)

| Término actual | Reemplazo propuesto | Estrategia |
|---|---|---|
| `empleado/empleados` (como categoría de personas) | `personal` | Colectivo neutro |
| `el empleado` (en error messages) | `la persona` / `esta persona` | Artículo femenino inclusivo |
| `Nuevo empleado` (CTA) | `Nueva persona` / `Añadir persona` | Neutro directo |
| `el/los voluntario/s` | `el voluntariado` | Epiceno singular colectivo |
| `voluntario` (adjetivo en hints) | `de voluntariado` | Epiceno |
| `trabajador/trabajadores` (key interna) | **sin cambio** (identificador JS) | — |
| `coordinador/coordinadores` (UI label) | `coordinación` | Colectivo neutro |
| `tipo de empleado` | `categoría de personal` | Neutro descriptivo |
| `el usuario` (en error) | `la cuenta` | Objeto, no persona |
| `Usuario desactivado` | `Cuenta desactivada` | Objeto, no persona |
| `el administrador` | `la administración` | Colectivo institucional |
| `ningún administrador` | `ninguna persona administradora` | Desdoble explícito |
| `administrador puede` | `la administración puede` | Colectivo institucional |
| `Apuntarse como voluntario` | `Formulario de voluntariado` | Epiceno |
| `solicitud de voluntario` | `solicitud de voluntariado` | Epiceno |
| `enviados a voluntarios` | `enviados al voluntariado` | Epiceno colectivo |
| `camarero` (en ejemplos/placeholders) | `camarera/o` o `personal de barra` | Desdoble o neutro |

---

_Generado en fase D2.1 — solo propuesta, ningún fichero modificado._
