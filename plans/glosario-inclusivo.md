# Glosario Inclusivo — Inventario de Género Genérico

**Objetivo**: Reemplazar strings que usan género masculino genérico con alternativas más inclusivas, manteniendo claridad y naturalidad en español.

**Criterios de cambio**:
- **Colectivos naturales** (preferente): "personal", "plantilla", "equipo", "solicitudes"
- **Desdoble solo cuando sea natural**: raramente necesario en títulos/botones
- **Neutros siempre que sea posible**: "quién", "la persona", "cada"
- **Contexto preservado**: cambios léxicos puros, sin afectar lógica ni estructura

---

## 1. Módulo Admin — Usuarios

| Archivo | Línea | Actual | Propuesto | Justificación |
|---------|-------|--------|-----------|---------------|
| [`app/src/app/(app)/admin/ediciones/_components/toggle-activa.tsx`](../../app/src/app/(app)/admin/ediciones/_components/toggle-activa.tsx) | 22 | `"Solo un administrador puede cambiar este estado"` | `"Solo el administrador puede cambiar este estado"` | El artículo neutro "el" es más natural; la acción es genérica |
| [`app/src/app/(app)/admin/usuarios/_components/toggle-activo.tsx`](../../app/src/app/(app)/admin/usuarios/_components/toggle-activo.tsx) | 42 | `"Solo un administrador puede cambiar este estado"` | `"Solo el administrador puede cambiar este estado"` | Consistencia con ediciones |
| [`app/src/app/(app)/admin/usuarios/actions.ts`](../../app/src/app/(app)/admin/usuarios/actions.ts) | 103 | `"No se puede: dejaría el sistema sin ningún administrador activo."` | `"No se puede: dejaría el sistema sin personal administrativo activo."` | Sustituir "administrador" (rol) por "personal administrativo" (colectivo) |
| [`app/src/app/(app)/admin/usuarios/actions.ts`](../../app/src/app/(app)/admin/usuarios/actions.ts) | 148 | `"No se puede: dejaría el sistema sin ningún administrador activo."` | `"No se puede: dejaría el sistema sin personal administrativo activo."` | Consistencia con línea 103 |
| [`app/src/app/login/login-form.tsx`](../../app/src/app/login/login-form.tsx) | 35 | `"Esta cuenta ha sido desactivada. Contacta con el administrador."` | `"Esta cuenta ha sido desactivada. Contacta con la administración."` | "la administración" es más inclusivo e institucional |

---

## 2. Módulo Admin — Tipos de Empleado

| Archivo | Línea | Actual | Propuesto | Justificación |
|---------|-------|--------|-----------|---------------|
| [`app/src/app/(app)/admin/casetas/schema.ts`](../../app/src/app/(app)/admin/casetas/schema.ts) | 17 | `"Tipo de empleado inválido"` | `"Tipo de empleado inválido"` | ✅ Neutro, no cambia |
| [`app/src/app/(app)/admin/tipos-empleado/page.tsx`](../../app/src/app/(app)/admin/tipos-empleado/page.tsx) | 31 | `"Categorías editables (con color propio) que se aplican a empleados y plazas de turno."` | ✅ Neutro, no cambia | El plural "empleados" es genérico en contexto técnico |
| [`app/src/app/(app)/admin/tipos-empleado/page.tsx`](../../app/src/app/(app)/admin/tipos-empleado/page.tsx) | 39 | `"Define los tipos (camarero, coordinador, voluntario…) y sus colores."` | ✅ Neutro, no cambia | Plural genérico + ejemplos con variedad |
| [`app/src/app/(app)/admin/tipos-empleado/[id]/page.tsx`](../../app/src/app/(app)/admin/tipos-empleado/%5Bid%5D/page.tsx) | 26 | `"Los cambios afectan a empleados y plazas que usen este tipo."` | ✅ Neutro, no cambia | Plural genérico, contexto técnico |

---

## 3. Módulo Admin — Casetas

| Archivo | Línea | Actual | Propuesto | Justificación |
|---------|-------|--------|-----------|---------------|
| [`app/src/app/(app)/admin/casetas/_components/toggle-activa.tsx`](../../app/src/app/(app)/admin/casetas/_components/toggle-activa.tsx) | 33 | `"Necesitas rol admin o gerente para cambiar este estado"` | `"Necesitas rol de administrador/a o gerencia para cambiar este estado"` | Desdoble cautela: "administrador/a" + "gerencia" (colectivo) |

---

## 4. Módulo Admin — Entidades de Voluntarios

| Archivo | Línea | Actual | Propuesto | Justificación |
|---------|-------|--------|-----------|---------------|
| [`app/src/app/(app)/admin/entidades/page.tsx`](../../app/src/app/(app)/admin/entidades/page.tsx) | 34 | `"Hermandades, peñas o agrupaciones a las que pertenecen los voluntarios. Las inactivas no aparecen en el formulario público pero conservan sus referencias."` | `"Hermandades, peñas o agrupaciones de personas voluntarias. Las inactivas no aparecen en el formulario público pero conservan sus referencias."` | "de personas voluntarias" es más inclusivo que "los voluntarios" |
| [`app/src/app/(app)/admin/entidades/page.tsx`](../../app/src/app/(app)/admin/entidades/page.tsx) | 45 | `"Crea al menos una entidad para poder publicar el formulario público de voluntarios."` | `"Crea al menos una entidad para poder publicar el formulario público de personas voluntarias."` | Consistencia con línea 34 |

---

## 5. Módulo Caja — Nóminas

| Archivo | Línea | Actual | Propuesto | Justificación |
|---------|-------|--------|-----------|---------------|
| [`app/src/app/(app)/caja/nominas/page.tsx`](../../app/src/app/(app)/caja/nominas/page.tsx) | 106 | `"Pulsa 'Calcular nóminas' para generar las nóminas de los empleados con asistencia registrada."` | `"Pulsa 'Calcular nóminas' para generar las nóminas de la plantilla con asistencia registrada."` | "la plantilla" es colectivo natural + neutro de género |

---

## 6. Módulo Turnos

| Archivo | Línea | Actual | Propuesto | Justificación |
|---------|-------|--------|-----------|---------------|
| [`app/src/app/(app)/turnos/_components/DialogoNuevoTurno.tsx`](../../app/src/app/(app)/turnos/_components/DialogoNuevoTurno.tsx) | 102 | `"Define el horario y los empleados asignados (0..N)."` | `"Define el horario y el personal asignado (0..N)."` | "el personal" es colectivo neutro |
| [`app/src/app/(app)/turnos/schema.ts`](../../app/src/app/(app)/turnos/schema.ts) | 72 | `"Tipo de empleado inválido"` | ✅ Neutro, no cambia | Validación técnica, plural genérico |
| [`app/src/app/(app)/turnos/asistencias/page.tsx`](../../app/src/app/(app)/turnos/asistencias/page.tsx) | 106 | `"Empleados que han asistido a turnos. Filtros aplican a página y exportación."` | `"Personal que ha asistido a turnos. Filtros aplican a página y exportación."` | "Personal" es colectivo natural |

---

## 7. Módulo Mantenimiento

| Archivo | Línea | Actual | Propuesto | Justificación |
|---------|-------|--------|-----------|---------------|
| [`app/src/app/(app)/admin/mantenimiento/_components/DialogoRellenarPlazas.tsx`](../../app/src/app/(app)/admin/mantenimiento/_components/DialogoRellenarPlazas.tsx) | 99 | `"No puedes repetir el mismo tipo de empleado"` | `"No puedes repetir el mismo tipo de rol"` | "rol" es más abstracto e inclusivo que "empleado" en este contexto |

---

## 8. Módulo Admin — Ajustes

| Archivo | Línea | Actual | Propuesto | Justificación |
|---------|-------|--------|-----------|---------------|
| [`app/src/app/(app)/admin/ajustes/page.tsx`](../../app/src/app/(app)/admin/ajustes/page.tsx) | 20 | `"Edita los textos enviados a voluntarios al rechazar turnos. Variables disponibles: {nombre}, {motivo}, {turnos}, {caseta}, {fechas}."` | `"Edita los textos enviados a personas voluntarias al rechazar turnos. Variables disponibles: {nombre}, {motivo}, {turnos}, {caseta}, {fechas}."` | "personas voluntarias" es más inclusivo |

---

## Resumen de Cambios

**Total de strings con género genérico encontrados**: 13  
**A cambiar (con impacto)**: 11  
**Sin cambio (ya neutro)**: 2

| Categoría | Estrategia | Ejemplos |
|-----------|-----------|----------|
| **Colectivos naturales** | Sustituir por plural genérico o colectivo | "los empleados" → "el personal" / "la plantilla" |
| **Rol institucional** | Cambiar artículo o usar colectivo | "administrador" → "administración" / "personal administrativo" |
| **Personas voluntarias** | Usar "personas voluntarias" en lugar de "los voluntarios" | Transparente, naturalmente inclusivo |
| **Artículos singulares** | "un" / "el" genéricos → "el" más natural o específico | "Un administrador" → "El administrador" |

---

## Notas de Implementación

1. **Alcance limitado**: cambios solo en strings UI visibles (labels, descriptions, error messages).
2. **Código técnico preservado**: comentarios, nombres de variables, tipos de datos NO se tocan.
3. **Consistencia**: los cambios en un módulo se replican en referencias cruzadas (ej. entidades de voluntarios).
4. **Reversibilidad**: cada string mapea 1-a-1 sin lógica condicional; cambio es léxico puro.
5. **Testing**: no afecta Prisma, Zod, rutas ni Server Actions — solo rendering en React.

---

## Siguientes Pasos (según feedback del usuario)

- [ ] Aprobar glosario sin cambios
- [ ] Aprobar con modificaciones puntuales
- [ ] Rechazar y redefinir estrategia
- [ ] Implementar cambios en rama `feature/glosario-inclusivo`

