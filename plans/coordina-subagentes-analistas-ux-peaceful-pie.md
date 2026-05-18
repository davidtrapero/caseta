# Plan: Mejoras UX en módulo de turnos

## Contexto

Cuatro hallazgos detectados mientras se opera el módulo de turnos durante feria:

1. **Colores en exportables**: las vistas día/semana/empleado/imprimir descargables como PNG/PDF muestran texto plano sin diferenciar tipos de empleado. La vista `semana-global` ya lo resuelve con badges coloreados via `colorFor()` — hay que propagar el patrón.
2. **Bug de stacking del combo "+ empleado"**: en `/turnos`, el dropdown de asignación se renderiza por detrás de filas posteriores. El layout `(app)/layout.tsx` tiene `overflow-auto` que crea un stacking context atrapando el dropdown `absolute z-30`.
3. **Aclaración sobre validación de asistencias** (no requiere código): el módulo no se ha perdido. El checkbox vive en [ChipEmpleado.tsx:85-105](../app/src/app/(app)/turnos/_components/ChipEmpleado.tsx#L85-L105) pero solo se renderiza si `dia.fecha <= dia.hoyIso` ([CalendarioDia.tsx:23](../app/src/app/(app)/turnos/_components/CalendarioDia.tsx#L23)). Si miras el día 11 estando hoy el 10, está oculto a propósito. La pantalla de listado/exportación está en [/turnos/asistencias](../app/src/app/(app)/turnos/asistencias/page.tsx).
4. **Duplicar entre casetas**: hoy `DialogoDuplicarDia` y `BotonDuplicarSemana` solo permiten copiar dentro de la misma caseta. Añadir selector de caseta origen para replicar planificación entre casetas.

---

## Cambio 1 — Migrar combo "+ empleado" a Popover de shadcn

### Archivos
- **Crear**: `app/src/components/ui/popover.tsx` (shadcn/Radix wrapper estándar — no existe aún).
- **Modificar**: [AsignarEmpleado.tsx](../app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx) — sustituir el `<div className="relative">` + `<div className="absolute z-30">` por `<Popover>` / `<PopoverTrigger>` / `<PopoverContent>`.

### Pasos
1. Instalar `@radix-ui/react-popover` (verificar si ya viene transitivo).
2. Generar `popover.tsx` con el patrón ya usado en [modal.tsx](../app/src/components/ui/modal.tsx) y [sheet.tsx](../app/src/components/ui/sheet.tsx) (Portal + `fixed z-50`).
3. En `AsignarEmpleado.tsx`:
   - Reemplazar el estado `open` manual por el `open`/`onOpenChange` controlado del `Popover` (necesario para cerrar tras éxito de la action).
   - Eliminar `onMouseLeave` (Radix gestiona click-outside, ESC y focus trap).
   - Conservar `w-64`, `max-h-72 overflow-auto`, estructura de grupos por tipo y el `useEffect` con `queueMicrotask(() => setOpen(false))`.

### Verificación manual
- `/turnos?fecha=...&casetaId=...` con varios turnos: el dropdown se solapa por encima de los siguientes y del borde de la card.
- ESC y click-outside cierran. Tras asignar empleado, el popover se cierra.

---

## Cambio 2 — Código de colores en vistas exportables

### Archivos
- [exportar/dia/page.tsx](../app/src/app/(app)/turnos/exportar/dia/page.tsx) — chip coloreado por nombre en columna "Empleados".
- [exportar/semana/page.tsx](../app/src/app/(app)/turnos/exportar/semana/page.tsx) — idem en columna "Asignados".
- [exportar/empleado/page.tsx](../app/src/app/(app)/turnos/exportar/empleado/page.tsx) — acento de color en cabecera del empleado.
- [imprimir/page.tsx](../app/src/app/(app)/turnos/imprimir/page.tsx) — `border-left: 4px solid {colorHex}` en cada `.emp-line`, manteniendo el checkbox de asistencia.

### Pasos
1. Reutilizar [perfiles.ts:57](../app/src/app/(app)/turnos/_lib/perfiles.ts#L57) `colorFor(tipo)` — devuelve `{bg, border, text}`.
2. Las páginas ya tienen `dia.tiposEmpleado` / `semana.tiposEmpleado` cargados; las asignaciones traen `tipoEmpleadoId`. Buscar tipo por id en cada render. Si el loader no expone hoy `tipoEmpleadoId` en `asignaciones`, ampliarlo en [turnos/_lib/loader.ts](../app/src/app/(app)/turnos/_lib/loader.ts).
3. Inline styles, sin tocar `globals.css` ni `LayoutExport.tsx`. Patrón: [exportar/semana-global/page.tsx:66-84](../app/src/app/(app)/turnos/exportar/semana-global/page.tsx#L66-L84).
4. En `imprimir/page.tsx`: `border-left` con `colorHex` para que la versión B/N siga siendo legible.

### Verificación manual
- En cada vista, descargar PNG y comprobar coloreado por tipo. Para PDF (`window.print()`) verificar `print-color-adjust: exact`.
- Crear un tipo nuevo en admin con un `colorHex` no usado y comprobar que `colorFor()` lo procesa sin tocar código.

---

## Cambio 3 — Duplicar día/semana entre casetas

### Archivos
- [schema.ts:131](../app/src/app/(app)/turnos/schema.ts#L131) `duplicarDiaSchema` y `:145` `duplicarSemanaSchema`: añadir `casetaIdOrigen: z.string().cuid().optional()`.
- [actions.ts:480](../app/src/app/(app)/turnos/actions.ts#L480) `duplicarDiaAction` y `:534` `duplicarSemanaAction`:
  - En el `prisma.turno.findMany`, cambiar `casetaId: data.casetaId` por `casetaId: data.casetaIdOrigen ?? data.casetaId`.
  - Si `casetaIdOrigen && casetaIdOrigen !== casetaId`, validar también la caseta origen con `validarCasetaActiva`.
- [DialogoDuplicarDia.tsx](../app/src/app/(app)/turnos/_components/DialogoDuplicarDia.tsx) y [BotonDuplicarSemana.tsx](../app/src/app/(app)/turnos/_components/BotonDuplicarSemana.tsx):
  - Recibir `casetas: { id, nombre }[]` por props.
  - Añadir `<select>` "Copiar desde la caseta…" con default = caseta actual marcada como "(esta caseta)".
- Callers ([CalendarioDia.tsx](../app/src/app/(app)/turnos/_components/CalendarioDia.tsx) y page de semana): pasar `dia.casetas` / `semana.casetas` (ya cargadas por el loader; verificar y ampliar si hace falta).

### UX
- Selector aparece encima de "Día origen" en el modal de día y arriba del todo en el de semana.
- Si origen ≠ destino y `copiarAsignaciones=true`: warning ("Las asignaciones se replicarán; revisa que los empleados sigan dados de alta para la caseta destino"). `Empleado` es global por edición — confirmar en schema antes de implementar para ajustar el copy.
- La validación de solapes existente (en `validarYCopiarTurnos`) sigue activa contra los turnos de la caseta destino.

### Verificación manual
- Plantilla en "Caseta escenario" → desde "Caseta principal" abrir "Duplicar día" → seleccionar "Caseta escenario" como origen → turnos copiados con plazas correctas.
- Repetir con `copiarAsignaciones=true`.
- Duplicar dentro de la misma caseta sigue funcionando idéntico (compatibilidad).
- Si la caseta destino tiene turnos en ese día, abortar por solape.

---

## Actualización del catálogo QA y specs E2E

**Obligatorio** tras cualquiera de los tres cambios. Catálogo en [docs/qa-cases/](../docs/qa-cases/), specs en [app/tests-e2e/qa-cases/](../app/tests-e2e/qa-cases/).

### Casos a añadir/actualizar en [docs/qa-cases/turnos.md](../docs/qa-cases/turnos.md)
- **TURNOS-XX (combo +empleado)**: dado un día con ≥3 turnos visibles, al pulsar "+ empleado" en el primer turno el dropdown se solapa por encima de los siguientes; ESC y click-outside lo cierran; tras asignar empleado el popover se cierra solo.
- **TURNOS-XX (colores exportables)**: en `/turnos/exportar/dia`, `/turnos/exportar/semana`, `/turnos/exportar/empleado` e `/turnos/imprimir`, cada empleado se muestra con el color del tipo (verificar `data-testid` o estilo inline en el chip). Crear tipo nuevo con `colorHex` distinto y validar coloreado sin recompilar.
- **TURNOS-XX (duplicar entre casetas — día)**: con plantilla en caseta A, desde caseta B abrir "Duplicar día", seleccionar A como origen, confirmar; los turnos aparecen en B con sus plazas y (si flag activo) asignaciones.
- **TURNOS-XX (duplicar entre casetas — semana)**: idem con `BotonDuplicarSemana`.
- **TURNOS-XX (regresión duplicación misma caseta)**: el flujo previo sin selector cambiado sigue funcionando.

### Specs a tocar en [app/tests-e2e/qa-cases/turnos.spec.ts](../app/tests-e2e/qa-cases/turnos.spec.ts)
- Añadir un `test()` por cada caso nuevo del catálogo. Usar los helpers existentes en [_helpers.ts](../app/tests-e2e/_helpers.ts) y [_shared/login.md](../docs/qa-cases/_shared/login.md) / [_shared/reset.md](../docs/qa-cases/_shared/reset.md).
- Para el caso del Popover: `await page.getByRole("button", { name: /\+ empleado/i }).click(); await expect(page.getByRole("dialog")).toBeVisible();` — Radix Popover usa `role=dialog` en `PopoverContent`, lo que da selectores estables.
- Para colores: aserción sobre `style` inline o `data-tipo` (mejor añadir `data-tipo-slug={tipo.slug}` en los chips para selectores robustos).
- Para duplicación entre casetas: seed previo con turnos en una caseta plantilla, abrir modal en otra caseta, asertar `prisma.turno.count` por caseta destino tras la action.

### Sincronización del catálogo
- Tras mergear, ejecutar `/qa-catalog-sync` para refrescar [docs/qa-cases/.last-sync](../docs/qa-cases/.last-sync) y detectar nuevas rutas/actions/componentes.
- Antes de cerrar la rama, lanzar `/qa-e2e` para que la suite traduzca casos a specs y corra `npx playwright test`.

---

## Orden de ejecución sugerido

1. **Cambio 1 (Popover)** — desbloquea uso real en feria.
2. **Cambio 3 (duplicar entre casetas)** — feature funcional, alto valor.
3. **Cambio 2 (colores exportables)** — pulido visual.
4. **Catálogo QA + specs E2E** — al cierre de cada cambio, no como bloque al final.

Cada cambio es independiente: commits separados, sin bundling forzado.

## Notas

- Sin migraciones de BD: `TipoEmpleado.colorHex` ya existe; los Zod schema admiten campos opcionales sin tocar Prisma.
- Sin nuevas dependencias salvo `@radix-ui/react-popover` (probablemente transitivo).
- Tras cualquier cambio que afecte runtime, reiniciar `next dev` si está corriendo (cliente Prisma cacheado — feedback de [memory/feedback_reiniciar_dev_server.md](../../.claude/projects/c--Proyectos-caseta/memory/feedback_reiniciar_dev_server.md)).
