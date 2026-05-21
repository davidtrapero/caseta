# Recon: URL pública para formulario de empleados + limpieza copy "Hermandad"

> Brief de contexto previo a redacción de plan. Dos cambios pequeños y localizados que se entregan juntos por afinidad temática (ambos tocan UX del flujo público de inscripción).

## Contexto

En `/admin/ediciones`, la columna **"FORMULARIO PÚBLICO"** muestra una sola URL: `{baseUrl}/apuntarse/{token}` con botones [Copiar] [Rotar] [Despublicar]. Esa URL lleva al formulario de **voluntarios**.

El repo ya tiene implementado un formulario público paralelo para **empleados** en `/apuntarse-empleado/[token]`, con su propio modelo (`SolicitudEmpleado`), su propia lógica de aprobación (tab "Empleados" en `/admin/solicitudes`) y compartiendo el **mismo** `Edicion.formularioToken`. Pero la URL `/apuntarse-empleado/{token}` **no se expone en ninguna UI admin** — el usuario no tiene forma de copiarla y compartirla.

Adicionalmente, el formulario público de voluntarios muestra el label "**Entidad / hermandad**". El usuario quiere que la palabra "hermandad" desaparezca de toda la UI — solo debe leerse "Entidad".

## Objetivo

1. Exponer en `/admin/ediciones` la URL `{baseUrl}/apuntarse-empleado/{token}` junto a la de voluntarios para que el admin pueda copiarla.
2. Eliminar la palabra "Hermandad/hermandad" de toda la UI visible al usuario.

## Decisiones cerradas (con el usuario)

- **Presentación de URLs**: opción A — dos filas con etiqueta en la columna "FORMULARIO PÚBLICO":
  ```
  Voluntarios  http://.../apuntarse/{token}            [Copiar]
  Empleados    http://.../apuntarse-empleado/{token}   [Copiar]
                                          [Rotar] [Despublicar]
  ```
- **Rotar / Despublicar**: únicos. El token es compartido (`Edicion.formularioToken`), una sola acción afecta a ambos formularios.

## Archivos críticos

### Cambio 1 — exponer URL empleados
- **A modificar**: [publicar-formulario.tsx](app/src/app/(app)/admin/ediciones/_components/publicar-formulario.tsx)
  - Línea 25 actual: `const url = token ? \`${baseUrl}/apuntarse/${token}\` : null;`
  - Reemplazar por dos URLs (`urlVoluntarios`, `urlEmpleados`).
  - Generalizar el estado `copiado` de `boolean` a `"voluntarios" | "empleados" | null` para que el feedback "Copiado ✓" aparezca solo en el botón pulsado.
  - Generalizar `copiar()` a `copiar(tipo: "voluntarios" | "empleados")`.
- **NO tocar**: [actions.ts](app/src/app/(app)/admin/ediciones/actions.ts) — `publicarFormularioAction`, `rotarFormularioAction`, `despublicarFormularioAction` siguen igual (token compartido).
- **NO tocar**: [schema.prisma](app/prisma/schema.prisma) — sin migración.

### Cambio 2 — eliminar "Hermandad" de UI
- [formulario-voluntario.tsx:138](app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx#L138): `"Entidad / hermandad"` → `"Entidad"`.
- [admin/entidades/page.tsx:65](app/src/app/(app)/admin/entidades/page.tsx#L65): `"Hermandades, peñas o agrupaciones"` → `"Entidades"` (o copy equivalente sin "hermandad" — confirmar al implementar).
- **No se toca**: comentarios en [schema.prisma:434](app/prisma/schema.prisma) y [turnos/types.ts:15](app/src/app/(app)/turnos/types.ts#L15) — son documentación interna para el desarrollador, no UI.
- **A decidir al implementar**: [seed.ts:125](app/prisma/seed.ts#L125) contiene `"Hermandad del Rocío"` como dato demo. No es UI hardcodeada; lo dejamos salvo orden explícita.

## Tareas atómicas propuestas

1. Generalizar estado `copiado` en `publicar-formulario.tsx` a discriminated string.
2. Construir `urlVoluntarios` y `urlEmpleados` a partir de `baseUrl` + `token`.
3. Refactorizar `copiar()` para aceptar `tipo` y escribir la URL correcta en clipboard.
4. Renderizar dos filas (etiqueta + `<code>` + Copiar) seguidas de [Rotar] [Despublicar] al final, con feedback "Copiado ✓" condicional al `tipo`.
5. Cambiar literal `"Entidad / hermandad"` → `"Entidad"` en `formulario-voluntario.tsx`.
6. Revisar y ajustar copy en `admin/entidades/page.tsx` línea 65 para eliminar "Hermandades".
7. Verificación manual (ver más abajo).

## Plan de verificación

Sin tests automatizados (consistente con el estado del repo). Verificación manual:

1. `npm run lint` — pasa sin warnings nuevos.
2. `npm run dev` y navegar a `/admin/ediciones` con una edición publicada:
   - Ambas URLs visibles con sus etiquetas.
   - Pulsar Copiar voluntarios → pegar en navegador → carga `/apuntarse/{token}` (formulario voluntarios) y muestra label **"Entidad"** (sin "hermandad").
   - Pulsar Copiar empleados → pegar en navegador → carga `/apuntarse-empleado/{token}` (formulario empleados).
   - El feedback "Copiado ✓" solo aparece en el botón pulsado.
   - Pulsar Rotar → ambas URLs reflejan el nuevo token.
   - Pulsar Despublicar → ambas URLs desaparecen.
3. Visitar `/admin/entidades` y verificar que ningún copy contiene "Hermandad".

## Convenciones a respetar

- Idioma del plan y del UI copy: **español**.
- Stack: Next.js 16 App Router + React 19 + Tailwind 4 + shadcn/ui.
- El componente `publicar-formulario.tsx` es Client Component (`"use client"`); mantener.
- Sin abstracciones nuevas: no extraer helper de URL ni componente reutilizable — son 2 strings.
- Identificadores en inglés salvo dominio (`token`, `apuntarse`, `apuntarse-empleado`).

## Riesgos

- **Crecimiento vertical de la fila** en el listado de ediciones (opción A apila 2 URLs). Aceptable: hay pocas ediciones por año.
- **Hardcodeo de paths**: `/apuntarse-empleado` queda escrito a mano en el componente. Aceptable mientras no exista helper de rutas en el repo.

## Arquitecto

Omitido: cambio localizado a 1 componente cliente + 2 literales de copy. Sin cross-cutting, sin nuevos módulos, sin schema.

## Integración posterior

Cuando termine el desarrollo, usar `close-development` para PR. No requiere migración Prisma ni deploy especial.
