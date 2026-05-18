# Exportación de turnos a PDF/imagen (semanal global, por caseta, por empleado)

## Contexto

Hoy existe `/turnos/imprimir` (un día, una caseta) usado para sacar el cuadrante diario en papel con casillas de asistencia. No cubre el caso de uso real: la organización quiere **ver de un vistazo** la asignación de la semana completa y, sobre todo, **detectar huecos sin cubrir** antes de que llegue el día. Tampoco hay forma de exportar el cuadrante de un empleado para entregárselo individualmente, ni una vista global de la semana cruzando todas las casetas.

El requisito pedido: "exportación de turnos (diario, semanal, por caseta) que genere un PDF o imagen con una tabla para consultar de un vistazo la asignación y los huecos vacíos".

Decisiones tomadas con el usuario:
- **Formato**: ambos — PDF vía `window.print()` (sin dependencias) + PNG cliente vía librería ligera (`html-to-image`).
- **Vistas**: Semanal global (todas las casetas) + Por caseta (diario y semanal) + Por empleado.
- **Huecos**: filas/celdas `VACANTE` en línea (color granate `--destructive`) **+** resumen agregado al pie.
- **Filtros**: reutilizar los selectores de `/turnos/semana` (caseta + semana en query params); botón "Exportar" en cada vista existente.

## Enfoque

Tres páginas server-rendered en `/turnos/exportar/*` que reciben filtros por query string, comparten un layout de impresión común y un componente cliente con dos botones (Imprimir → PDF, Descargar imagen → PNG). Loader nuevo en `_lib/loader.ts` para los casos que los actuales no cubren (semanal global multi-caseta, por empleado).

### Rutas nuevas

| Ruta | Vista | Filtros | Reutiliza |
|---|---|---|---|
| `/turnos/exportar/semana` | Tabla semanal de **una caseta** (7 columnas días × N filas turnos), con filas VACANTE por plaza no cubierta | `casetaId`, `semana` | `loadSemanaTurnos` ✓ |
| `/turnos/exportar/semana-global` | Tabla semanal **multi-caseta**: filas = casetas, columnas = días, celdas = resumen turnos + huecos | `semana` | Loader nuevo `loadSemanaGlobal()` |
| `/turnos/exportar/dia` | Tabla diaria de una caseta con filas VACANTE en cada turno + resumen | `casetaId`, `fecha` | `loadDiaTurnos` ✓ (extendido) |
| `/turnos/exportar/empleado` | Tabla con turnos asignados a un empleado en un rango | `empleadoId`, `desde`, `hasta` | Loader nuevo `loadTurnosEmpleado()` |

### Cambios en loaders ([app/src/app/(app)/turnos/_lib/loader.ts](app/src/app/(app)/turnos/_lib/loader.ts))

1. **Extender `TurnoSerializable`** o crear helper `vacantesDeTurno(turno, tiposEmpleado)` que devuelva, por turno, un array `{ tipoEmpleadoId, faltan: number }` calculado como `plaza.cantidad − asignaciones.filter(a => a.tipoEmpleadoId === plaza.tipoEmpleadoId).length`. Reutilizable en todas las páginas de export.
2. **`loadSemanaGlobal({ lunes, edicionId })`**: igual que `loadSemanaTurnos` pero **sin** `casetaId` en el `where` y agrupando por `casetaId` → `Record<casetaId, ResumenDiaSemana[]>`. Añadir `vacantesPorDia` por celda.
3. **`loadTurnosEmpleado({ empleadoId, desde, hasta, edicionId })`**: query nueva — `prisma.turno.findMany({ where: { asignaciones: { some: { empleadoId } }, fechaInicio: { gte, lt } } })` con include de caseta.

### Componente compartido de export

[app/src/app/(app)/turnos/_components/LayoutExport.tsx](app/src/app/(app)/turnos/_components/LayoutExport.tsx) (nuevo):
- Wrapper con `<style>` de impresión (extraído de `imprimir/page.tsx:29-51`).
- Header con título, edición, fecha/rango, caseta(s).
- Slot para la tabla.
- Footer con resumen de huecos: `"3 plazas sin cubrir: vigilante (2), cocina (1)"`.
- Aplica paleta beige feria — fondos `#ebe3d3`, fuentes `var(--font-display)` para títulos.

[app/src/app/(app)/turnos/_components/BotonesExport.tsx](app/src/app/(app)/turnos/_components/BotonesExport.tsx) (nuevo, `"use client"`):
- Botón **Imprimir / Guardar PDF** → `window.print()` (mismo patrón que [BotonImprimir](app/src/app/(app)/turnos/_components/BotonImprimir.tsx)).
- Botón **Descargar imagen** → `htmlToImage.toPng(node)` sobre el contenedor, `download` con nombre `turnos-<vista>-<fecha>.png`.
- Recibe `targetId` (id del nodo a capturar) y `nombreArchivo`.

### Renderizado de huecos VACANTE

Por cada turno se itera sobre `plazas` y se compara con `asignaciones` agrupadas por tipo. Por cada plaza no cubierta se emite una fila gris claro con texto `VACANTE — <tipo empleado>` en color `--destructive`. Pseudocódigo:

```tsx
{turno.plazas.map(p => {
  const cubiertas = turno.asignaciones.filter(a => a.tipoEmpleadoId === p.tipoEmpleadoId).length;
  const vacantes = p.cantidad - cubiertas;
  return Array.from({ length: vacantes }).map((_, i) => (
    <tr className="vacante"><td colSpan={N}>VACANTE — {tipo.label}</td></tr>
  ));
})}
```

Resumen al pie: total de plazas vacantes agrupadas por tipo, sumadas sobre todos los turnos visibles.

### Botones de acceso desde vistas existentes

- En [`/turnos/semana/page.tsx`](app/src/app/(app)/turnos/semana/page.tsx) cabecera (junto al `BotonDuplicarSemana`): `<Link href="/turnos/exportar/semana?casetaId=...&semana=...">Exportar</Link>`.
- En [`/turnos/imprimir/page.tsx`](app/src/app/(app)/turnos/imprimir/page.tsx): renombrar este enlace o añadir variante "Vista exportable" — el imprimir actual está orientado a checkboxes de asistencia (caso de uso distinto: papel para fichar). **Mantenerlo intacto**, no fusionar.
- Nuevo enlace en `/turnos/semana` para "Vista global de la semana" → `/turnos/exportar/semana-global?semana=...`.
- En [`/admin/empleados`](app/src/app/(app)/admin/empleados) (lista o ficha de empleado): botón "Exportar turnos" → `/turnos/exportar/empleado?empleadoId=...&desde=...&hasta=...`. Por defecto rango = edición activa.

## Dependencia nueva

```bash
npm i html-to-image
```

`html-to-image` (~15KB minified, sin peer deps). Alternativa más ligera y mantenida que `html2canvas`. Se importa solo en `BotonesExport.tsx` (cliente), no afecta al bundle de server.

## Archivos a crear

- [app/src/app/(app)/turnos/exportar/semana/page.tsx](app/src/app/(app)/turnos/exportar/semana/page.tsx)
- [app/src/app/(app)/turnos/exportar/semana-global/page.tsx](app/src/app/(app)/turnos/exportar/semana-global/page.tsx)
- [app/src/app/(app)/turnos/exportar/dia/page.tsx](app/src/app/(app)/turnos/exportar/dia/page.tsx)
- [app/src/app/(app)/turnos/exportar/empleado/page.tsx](app/src/app/(app)/turnos/exportar/empleado/page.tsx)
- [app/src/app/(app)/turnos/_components/LayoutExport.tsx](app/src/app/(app)/turnos/_components/LayoutExport.tsx)
- [app/src/app/(app)/turnos/_components/BotonesExport.tsx](app/src/app/(app)/turnos/_components/BotonesExport.tsx)

## Archivos a modificar

- [app/src/app/(app)/turnos/_lib/loader.ts](app/src/app/(app)/turnos/_lib/loader.ts) — añadir `loadSemanaGlobal`, `loadTurnosEmpleado`, helper `vacantesDeTurno`.
- [app/src/app/(app)/turnos/types.ts](app/src/app/(app)/turnos/types.ts) — tipos `SemanaGlobal`, `TurnosEmpleado`, `VacanteTurno`.
- [app/src/app/(app)/turnos/semana/page.tsx](app/src/app/(app)/turnos/semana/page.tsx) — botón "Exportar" + link a semana global.
- [app/src/app/(app)/admin/empleados/page.tsx](app/src/app/(app)/admin/empleados/page.tsx) (o la ficha de empleado) — botón "Exportar turnos".
- [app/package.json](app/package.json) — `html-to-image`.

## Verificación

1. **Compilar**: `cd app && npm run build` — verifica TS estricto y que las nuevas rutas prerenderizan/dynamic correctamente.
2. **Lint**: `cd app && npm run lint`.
3. **Smoke manual con `npm run dev`**:
   - `/turnos/semana` → click "Exportar" → vista exportable carga con datos reales.
   - Click **Imprimir** → diálogo navegador → "Guardar como PDF" → revisar paginación y huecos VACANTE en granate.
   - Click **Descargar imagen** → PNG en disco con la tabla completa, fondo beige correcto.
   - `/turnos/exportar/semana-global?semana=2026-W19` → ver matriz casetas × días con huecos por celda.
   - `/turnos/exportar/empleado?empleadoId=...&desde=2026-05-01&hasta=2026-05-15` → tabla de turnos del empleado.
4. **Caso de huecos**: en una semana de prueba, dejar un turno con `TurnoPlaza.cantidad = 3` y solo 1 asignación → verificar que aparecen **2 filas VACANTE** + el resumen del pie las cuenta.
5. **Caso vacío**: caseta sin turnos → mensaje "No hay turnos programados" (no estallar).

## Fuera de alcance

- No se toca `/turnos/imprimir` (caso de uso distinto: papel con checkboxes de asistencia).
- No se exporta CSV (ya existe en `/turnos/asistencias`).
- No se añade exportación al módulo de voluntarios ni admin/solicitudes.
- No paginación automática — `@page { margin: 1.2cm }` + tablas que el navegador parta solo. Si una semana global no cabe, el usuario reduce escala desde el diálogo de impresión.
