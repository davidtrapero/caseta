# Plan — Rediseño de visualización de turnos (4 vistas)

## Context

El usuario gestiona turnos de caseta de feria desde [/turnos/semana](app/src/app/(app)/turnos/semana/page.tsx) y exporta cuadrantes con [/turnos/exportar/semana-global](app/src/app/(app)/turnos/exportar/semana-global/page.tsx), [/turnos/exportar/semana](app/src/app/(app)/turnos/exportar/semana/page.tsx) y [/turnos/exportar/dia](app/src/app/(app)/turnos/exportar/dia/page.tsx). Es **la parte que más usa**: planificación semanal, impresión para responsables y reparto a casetas.

Los 4 snapshots Playwright sobre la semana 2026-W20 + caseta `cmor0uizd0003e81neuxnrzvh` revelan tres problemas que dañan la operativa:

1. **Vacantes infladas en exportar**: cada plaza vacante se renderiza como una fila independiente. Lunes 11 may produce ~30 filas idénticas tipo `VACANTE — Voluntario`. El cuadrante imprimible es inutilizable.
2. **Nombres ocultos en `/turnos/semana`**: la vista de gestión muestra solo ratios (`Coor 0/1 · Trab 0/3`); los asignados viven a un click. El campo `asistio` viaja serializado pero no se renderiza ([loader.ts:269-282](app/src/app/(app)/turnos/_lib/loader.ts#L269-L282)).
3. **Sin KPIs ni jerarquía por rol**: ninguna vista muestra totales por día, % cobertura ni separa Coordinadores / Trabajadores / Voluntarios. El resumen "63 plazas sin cubrir" aparece solo al pie.

El objetivo es dejar la información **clara, precisa y amigable** preservando la identidad visual feria-andaluza del proyecto (tokens en [globals.css:33-128](app/src/app/globals.css#L33-L128)) y respetando la rigidez del cuadrante físico que se imprime.

## Decisiones consolidadas con el usuario

| Tema | Decisión |
|---|---|
| Orden de ataque | (1) Vacantes inline → (2) Nombres en `/semana` → (3) KPIs y agrupación por rol |
| Estructura `/exportar/semana` | Híbrido: tabla agrupada por día + bloque resumen arriba |
| Nombres en `/semana` | Formato compacto `Carlos R., María L., Juan P.` |
| KPIs | Banda superior con totales + subtotales por rol + agrupación visual por perfil (Coordinador / Trabajadores / Voluntarios / Demás) en las 4 vistas |
| Ubicación de vacantes | Inline en cada turno (no fila propia) |
| Casetas en `/exportar/semana-global` | Añadir filtro por caseta; si no hay filtro, casetas sin turnos colapsan a una sola fila |
| Pivot empleado×día | No |

## Cambios por vista

### 1) `/turnos/semana` — vista de gestión

**Archivo principal**: [app/src/app/(app)/turnos/semana/page.tsx:121-222](app/src/app/(app)/turnos/semana/page.tsx#L121-L222)

- **Banda superior nueva** justo bajo el `<h1>Caseta escenario</h1>`: `6 turnos · 18 personas · 23 vacantes · 78% cobertura` con `font-[var(--font-display)]` y números `tabular-nums`. Calcular en RSC sumando `ResumenDiaSemana` ya disponible en `SemanaTurnos.dias[]`.
- **Tarjeta de día** ([page.tsx:151-220](app/src/app/(app)/turnos/semana/page.tsx#L151-L220)): cada `<li>` de turno pasa a 3 líneas:
  1. Hora (`font-mono` `text-xs`).
  2. **Asignados agrupados por rol**: `<div>` con secciones `Coor · Trab · Vol · Otros`, cada una una banda compacta con nombres en formato `Carlos R., María L.`. Reusar `colorEmpleado()` de [_lib/colores.ts:26-44](app/src/app/(app)/turnos/_lib/colores.ts#L26-L44) para el chip de inicial.
  3. Línea de **vacantes inline**: `Vacantes: 2 Vol · 1 Coor` (solo si > 0).
- **Días sin turnos** (Jueves–Domingo en el snapshot): tarjeta colapsada visualmente a 1/3 de altura (`min-h-[80px]` en vez de `min-h-[240px]`), texto silente "Sin turnos". Conserva el link al editor.
- **Botones de acción** del header: separar visualmente "Exportar" y "Vista global" del navegador de fechas con un divider sutil. El botón "Duplicar semana" gana el peso primario.
- **Helper de formato** para nombres: añadir función `nombreCorto(nombre: string)` en [_lib/perfiles.ts](app/src/app/(app)/turnos/_lib/perfiles.ts) que devuelve `"Carlos R."` (primer nombre + inicial primer apellido). Reutilizable en las 4 vistas.

### 2) `/turnos/exportar/semana` — cuadrante por caseta (impresión)

**Archivo principal**: [app/src/app/(app)/turnos/exportar/semana/page.tsx:18](app/src/app/(app)/turnos/exportar/semana/page.tsx#L18)

- **Bloque resumen arriba** (decisión "híbrido"): banner con `<strong>` totales semana + tabla 1×N con conteo por día (`Lu 23 · Ma 19 · Mi 21 · Ju 0 · Vi 0 · Sá 0 · Do 0`). Mantener el cuadre actual de "63 plazas sin cubrir" desglosado por rol.
- **Tabla agrupada por día**: cabecera `<tr class="dia-header">` que ocupa todas las columnas con `Lu 11 may` y resumen del día a la derecha `5 turnos · 23 vac`. Después, una fila por **turno** (no por vacante).
- **Estructura por turno (4 columnas)**: `Horario | Duración | Asignados (agrupados por rol) | Vacantes`.
  - Columna **Asignados**: bloques verticales por rol con encabezado `Coordinador (1)` + lista compacta `Carlos R., María L.`. Si hay voluntarios, añadir badge `(V)` discreto al lado del nombre. Eliminar las filas redundantes "Sin asignar" + "VACANTE — X" del diseño actual.
  - Columna **Vacantes**: texto inline `2 Voluntarios · 1 Coordinador`. Si todo cubierto, dash. Si 0 asignados, texto en `text-muted` "Turno sin cubrir".
- **Loader**: revisar [_lib/loader.ts](app/src/app/(app)/turnos/exportar/_lib/loader.ts) (ver función equivalente a `loadSemanaTurnos`) para que devuelva un agregado `vacantesPorRol: { tipoSlug, label, cantidad }[]` por turno y `resumenDia: { turnos, personas, vacantes, vacantesPorRol }`.
- **Print CSS**: `page-break-inside: avoid` ya en bloques de día. Mantener `@page A4 landscape margin 1.2cm`. Evitar zebra rows en print (se imprime mal); usar separador entre días.

### 3) `/turnos/exportar/semana-global` — todas las casetas

**Archivo principal**: [app/src/app/(app)/turnos/exportar/semana-global/page.tsx:103](app/src/app/(app)/turnos/exportar/semana-global/page.tsx#L103)

- **Nuevo filtro por caseta**: parámetro `casetaIds` opcional (lista coma-separada). UI: multi-select en la cabecera (solo pantalla, oculto en print) reutilizando el patrón del `SelectorCaseta` existente en [_components/SelectorCaseta.tsx](app/src/app/(app)/turnos/_components/SelectorCaseta.tsx).
- **Casetas sin turnos cuando no hay filtro**: en lugar de fila con 7 celdas `—`, colapsar a fila única tipo `<tr class="caseta-vacia"><td colspan=8>Caseta CDC — sin turnos esta semana</td></tr>` con `text-muted` y altura mínima.
- **Banda superior** con totales globales: `N casetas · M turnos · K personas · V vacantes` + desglose por rol.
- **Nombres**: aplicar `nombreCorto()` en lugar de la abbreviation actual (`fasfas f.` se mantiene; `Carlos Ruiz` ahora es `Carlos R.`). Agrupar nombres dentro de la celda por rol (`Coor: Pablo J. · Trab: Carlos R., Javier M. · Vol: María L.`).
- **Sticky header**: añadir `sticky top-0 z-10 bg-background` al `<thead>` (ya existe convención en [components/ui/table.tsx:24](app/src/components/ui/table.tsx#L24)).
- **Vacantes inline** en cada celda de turno (no como fila aparte ni como nota debajo).

### 4) `/turnos/exportar/dia` — un día, una caseta

**Archivo principal**: [app/src/app/(app)/turnos/exportar/dia/page.tsx:11](app/src/app/(app)/turnos/exportar/dia/page.tsx#L11)

- **Banda superior**: `4 turnos · 8 personas asignadas · 21 vacantes · cobertura 27%`.
- **Eliminar filas-vacante** (las 16 filas tipo `VACANTE — X` del snapshot actual). En su lugar, añadir 4ª columna `Vacantes` con desglose `1 Coor · 3 Trab` por turno.
- **Distinguir turnos solapados** (11:00–19:00 y 11:00–15:00): franja vertical de color a la izquierda de cada `<tr>` con la paleta de horario (mañana ámbar `--primary`, tarde oliva `--accent`, noche burdeos derivado de `--secondary`). El color se decide por el rango: `inicio < 16h → mañana`, `16h ≤ inicio < 22h → tarde`, resto → noche.
- **Agrupar asignados por rol** dentro de la celda Empleados, igual que en exportar/semana.
- **Nombres** con `nombreCorto()` y badge `(V)` para voluntarios.
- **Pie con leyenda**: añadir junto a "Firma responsable" un mini-mapa de colores `Mañana | Tarde | Noche` para que el responsable de turno entienda la franja vertical.

## Sistema visual a respetar

- Tokens `--primary` (ámbar `#c68a3a`), `--accent` (oliva `#5e7040`), `--secondary` (cuero `#9b6b33`) ya en [globals.css:33-128](app/src/app/globals.css#L33-L128).
- Tipografía: `--font-display` (Fraunces/Instrument Serif) solo headings; `--font-sans` (IBM Plex) en cuerpo; `--font-mono` (Geist Mono) en horas y números — `tabular-nums` ya aplica automático en `<td>` por [globals.css:144-146](app/src/app/globals.css#L144-L146).
- **Glass surfaces** (`--surface-glass`, `--surface-glass-border`) solo en pantalla, **nunca en print**. Confirmar con `@media print { .glass { background: white; box-shadow: none; } }`.
- Reusar `colorEmpleado()` para chips de inicial y `colorFor()` para badges de rol; ya garantizan contraste AA.

## Helpers nuevos a crear

| Helper | Ubicación propuesta | Función |
|---|---|---|
| `nombreCorto(nombre)` | [_lib/perfiles.ts](app/src/app/(app)/turnos/_lib/perfiles.ts) | `"Carlos Ruiz" → "Carlos R."` con tolerancia a un solo nombre / sin apellido |
| `franjaHoraria(inicio)` | [_lib/fechas.ts](app/src/app/(app)/turnos/_lib/fechas.ts) | Devuelve `"manana" | "tarde" | "noche"` según hora de inicio |
| `agruparPorRol(asignaciones)` | [_lib/perfiles.ts](app/src/app/(app)/turnos/_lib/perfiles.ts) | Agrupa array de `TurnoEmpleado` en `{ coordinadores, trabajadores, voluntarios, otros }` |
| `resumenSemana(dias)` | [_lib/loader.ts](app/src/app/(app)/turnos/_lib/loader.ts) | Calcula `{ turnos, personas, vacantes, coberturaPct, vacantesPorRol }` para la banda superior |

## Archivos críticos a modificar

- [app/src/app/(app)/turnos/semana/page.tsx](app/src/app/(app)/turnos/semana/page.tsx) — banda superior, refactor de tarjeta de día
- [app/src/app/(app)/turnos/exportar/semana/page.tsx](app/src/app/(app)/turnos/exportar/semana/page.tsx) — refactor de tabla agrupada
- [app/src/app/(app)/turnos/exportar/semana-global/page.tsx](app/src/app/(app)/turnos/exportar/semana-global/page.tsx) — filtro por caseta + colapso vacías
- [app/src/app/(app)/turnos/exportar/dia/page.tsx](app/src/app/(app)/turnos/exportar/dia/page.tsx) — eliminar filas-vacante + franja horaria
- [app/src/app/(app)/turnos/exportar/_lib/loader.ts](app/src/app/(app)/turnos/exportar/_lib/loader.ts) — agregados nuevos
- [app/src/app/(app)/turnos/_lib/perfiles.ts](app/src/app/(app)/turnos/_lib/perfiles.ts) — `nombreCorto`, `agruparPorRol`
- [app/src/app/(app)/turnos/_lib/fechas.ts](app/src/app/(app)/turnos/_lib/fechas.ts) — `franjaHoraria`
- [app/src/app/(app)/turnos/types.ts](app/src/app/(app)/turnos/types.ts) — extender `ResumenDiaSemana` con `vacantesPorRol`
- [app/src/app/globals.css](app/src/app/globals.css) — añadir reglas `@media print` para neutralizar glass

## Verificación end-to-end

1. **Build & lint**:
   ```bash
   cd app
   npm run build
   npm run lint
   ```
2. **Pantalla**: navegar a las 4 URLs con la semana 2026-W20 y caseta `cmor0uizd0003e81neuxnrzvh`. Comprobar:
   - Banda superior con totales coherentes (turnos + personas + vacantes deben cuadrar con el detalle).
   - `nombreCorto()` aplicado en las 4 vistas.
   - Vacantes inline (no filas-vacante).
   - En `/turnos/semana`, días sin turnos colapsan visualmente.
3. **Impresión**:
   - En `/turnos/exportar/semana`: pulsar "Imprimir / PDF" y verificar que un día por bloque cabe en una página A4 horizontal sin partir filas.
   - En `/turnos/exportar/dia`: confirmar que la franja horaria izquierda imprime con `print-color-adjust: exact`.
   - Glass effects sin renderizar en print (fondo blanco, sin sombra).
4. **Filtro caseta-global**: navegar a `/turnos/exportar/semana-global?semana=2026-W20` (sin filtro) y comprobar que `Caseta CDC` aparece colapsada a una fila. Aplicar filtro `?semana=2026-W20&casetaIds=cmor0uizd0003e81neuxnrzvh` y verificar que solo aparece esa caseta.
5. **Datos cero**: probar `/turnos/exportar/semana?semana=2026-W22` (sin turnos) — debe renderizar la banda con `0 turnos · 0 vacantes` y un EmptyState limpio.
6. **Snapshot Playwright** post-cambio: repetir capturas con MCP playwright en las 4 URLs para comparar densidad y legibilidad.

## Fuera de alcance

- No se cambia el flujo de creación/edición de turnos ni los modales de duplicación.
- No se cambia el schema Prisma — todos los datos necesarios ya existen (`asistio`, `esVoluntario`, `tipoEmpleado`, `plazas`).
- No se añade pivot empleado×día (descartado).
- No se aborda exportación a Excel (ya hay PNG y print).
