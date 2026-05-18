# Plan — Vista global semanal con detalle de turnos por celda

## Context

La **Vista global** (botón en [/turnos/semana](app/src/app/(app)/turnos/semana/page.tsx) que enlaza a [/turnos/exportar/semana-global](app/src/app/(app)/turnos/exportar/semana-global/page.tsx)) muestra hoy una matriz **caseta × día** con solo agregados por celda: número de turnos, número de personas y badge rojo con vacantes. No permite ver qué turnos hay, quién está asignado ni qué tipo de hueco falta cubrir, así que el operador tiene que entrar caseta por caseta para diagnosticar problemas.

El usuario pide que cada celda muestre, sin clics extra:
- los **turnos del día** en esa caseta (rango horario);
- los **nombres de los empleados asignados** a cada turno;
- los **huecos disponibles por tipo** (Vig 0/1, Trab 1/3, Vol 4/4…).

Subagentes de UX validaron 3 alternativas (matriz expandida, agrupado por día, master-detail). El usuario eligió **matriz caseta×día con todo expandido**, priorizando la pantalla pero manteniendo razonable la impresión A4 landscape.

Buena noticia: el loader [loadSemanaGlobal](app/src/app/(app)/turnos/_lib/loader.ts#L346-L408) **ya carga** los turnos completos con asignaciones y plazas (los necesita para calcular `totalVacantes`), pero los descarta antes de devolver. El cambio en datos es trivial.

## Cambios

### 1. Tipos — [app/src/app/(app)/turnos/types.ts](app/src/app/(app)/turnos/types.ts)

Añadir `turnos: TurnoSerializable[]` a `SemanaGlobalCelda` (líneas 110-115). El resto del tipo (`numTurnos`, `numPersonas`, `totalVacantes`) sigue igual y se sigue usando en el resumen del pie y en el badge.

### 2. Loader — [app/src/app/(app)/turnos/_lib/loader.ts](app/src/app/(app)/turnos/_lib/loader.ts#L390-L395)

En el `dias.push({...})` del bucle por caseta×día (líneas 390-395), añadir `turnos: delDia`. `delDia` ya está calculado en la línea 379 con el filtro y orden correctos (`fechaInicio asc`). Ningún query nuevo.

### 3. Render expandido por celda — [app/src/app/(app)/turnos/exportar/semana-global/page.tsx](app/src/app/(app)/turnos/exportar/semana-global/page.tsx#L72-L109)

Reescribir el contenido de cada `<td>` con turnos. Estructura nueva:

```
┌─ Celda (caseta × día) ─────────────────┐
│ ● 18:00–22:00              [3 huecos]  │  ← cabecera turno (indicador severidad)
│   Vig 1/1  Trab 2/3  Vol 0/2           │  ← badges por tipo (asignados/plazas)
│   María L. · Pepe · Ana                │  ← nombres de asignados, separados por ·
│ ────────────────────────────────────── │
│ ● 22:00–02:00                          │
│   Coor 1/1                             │
│   Curro                                │
└────────────────────────────────────────┘
```

Detalles del render:
- **Lista vertical de turnos** dentro del `<td>`, separados por una línea fina (`border-top` en cada turno excepto el primero). El `<td>` actual conserva la clase `export-vacante` cuando el día tenga vacantes.
- **Indicador de severidad** (punto a la izquierda de la hora) con misma escala que ya implementamos en la vista semanal:
  - Verde — turno completo (`plazas.length > 0 && vacantesDeTurno(t).length === 0`).
  - Ámbar — vacantes (`> 0`).
  - Gris — sin plazas definidas (`plazas.length === 0`).
- **Hora**: `horaDe(t.fechaInicio)–horaDe(t.fechaFin)` con `tabular-nums` para alinear. Reusar [horaDe](app/src/app/(app)/turnos/_lib/fechas.ts#L82) que ya existe.
- **Badges por tipo**: usar [colorFor](app/src/app/(app)/turnos/_lib/perfiles.ts#L57) (ya arreglado en el cambio anterior). Misma lógica que en la card de día de la vista semanal: union de tipos en `plazas` + tipos en `asignaciones`, ordenados por `tiposEmpleado.orden`. Para cada tipo: `<labelCorto> <asignados>/<cantidad>` (sin `/N` si no hay plazas definidas).
- **Nombres de asignados**: lista plana del turno (`t.asignaciones.map(a => a.empleadoNombre)`) separados por `·`. Si hay >6 nombres, mostrar los 5 primeros + `+N más` con `title` que liste todos. Color gris medio (`text-muted-foreground`) para que las vacantes destaquen. Abreviar nombres largos: si el nombre tiene 2+ palabras, mostrar `Nombre A.` (primer apellido inicializado).
- **Sin turnos**: mantener el `—` actual.

Ajustes al CSS de tabla:
- Las celdas necesitan `vertical-align: top` y altura mínima cómoda (~80px). Si la clase `.export-table td` ya lo controla, solo añadir lo que falte en [LayoutExport.tsx](app/src/app/(app)/turnos/_components/LayoutExport.tsx).
- En **modo print**, las celdas pueden ocupar más espacio; añadir `page-break-inside: avoid` al `<tr>` para que una caseta no se parta entre páginas. Si la tabla no cabe en A4 landscape, dejar que la columna de caseta haga `position: sticky` solo en pantalla (no en print).

### 4. Helpers compartidos

No se crean helpers nuevos. Se reutilizan:
- [vacantesDeTurno](app/src/app/(app)/turnos/_lib/loader.ts#L25) — para indicador de severidad.
- [colorFor](app/src/app/(app)/turnos/_lib/perfiles.ts#L57) — para los colores de badges.
- [horaDe](app/src/app/(app)/turnos/_lib/fechas.ts#L82) — para el formato HH:MM.

La lógica de "agrupar tipos del turno + contar asignados por tipo" es la misma que ya escribimos en [page.tsx:147-200](app/src/app/(app)/turnos/semana/page.tsx) en el cambio anterior. Si ese bloque crece más, valoraría extraer un componente `<TurnoCard turno={t} tipos={...} />` en `_components/`, pero por ahora con dos copias es aceptable (el patrón "tres similares antes de extraer" del proyecto).

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| [app/src/app/(app)/turnos/types.ts](app/src/app/(app)/turnos/types.ts) | Añadir `turnos: TurnoSerializable[]` a `SemanaGlobalCelda`. |
| [app/src/app/(app)/turnos/_lib/loader.ts](app/src/app/(app)/turnos/_lib/loader.ts) | Rellenar `turnos: delDia` en el push de cada celda (línea 390). |
| [app/src/app/(app)/turnos/exportar/semana-global/page.tsx](app/src/app/(app)/turnos/exportar/semana-global/page.tsx) | Reescribir el contenido del `<td>` con la lista de turnos expandida. |
| [app/src/app/(app)/turnos/_components/LayoutExport.tsx](app/src/app/(app)/turnos/_components/LayoutExport.tsx) | Ajustar CSS de `.export-table td` (vertical-align, min-height) y añadir `page-break-inside: avoid` al `<tr>` para impresión. |

## Verificación

1. `npm run lint` desde `app/` — sin errores.
2. `npm run build` desde `app/` — prerender OK.
3. `npm run dev` y abrir [/turnos/semana](http://localhost:3000/turnos/semana), pulsar "Vista global":
   - Cada celda muestra los turnos del día con horas, nombres y huecos por tipo.
   - Punto verde en turnos completos, ámbar en turnos con vacantes, gris cuando no hay plazas definidas.
   - Las celdas del día pintadas como `export-vacante` (clase actual) siguen mostrando el badge "N vacantes" al final.
   - Día sin turnos sigue mostrando `—`.
   - Probar con un nombre muy largo (>20 caracteres) — verificar que se abrevia.
   - Probar con un turno con >6 personas — verificar que muestra `+N más`.
4. Probar `Ctrl+P` (vista de impresión del navegador):
   - La tabla cabe razonablemente en A4 landscape.
   - Una caseta no se parte entre páginas.
   - Los colores de severidad (puntos) se ven o, si el navegador descarta colores, queda legible.
5. Cambiar de semana con las flechas de la vista semanal y volver a pulsar "Vista global" para confirmar que la URL `?semana=YYYY-Www` se respeta.
