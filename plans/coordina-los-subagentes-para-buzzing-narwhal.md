# Plan coordinado — buzzing narwhal

## Context

Cinco mejoras independientes acumuladas en el backlog del usuario. El recon (Explorador → Analista → Arquitecto) ha identificado que **4 son cambios localizados** y **1 (multi-tipo de empleado) es cross-layer y rompe ~30 archivos** porque hoy `Empleado.tipoEmpleadoId` es 1:1 y se asume así en loaders, formularios, exports e informes. La tarea de "filtro caja por edición activa" ya está implementada — se reduce a verificar que no haya leak.

Decisiones funcionales cerradas con el usuario:
- **Multi-tipo**: relación N:M con tabla intermedia `EmpleadoTipo`.
- **Voluntario**: campo explícito `Empleado.esVoluntario` (no derivado).
- **Imputación a tipo en plazas**: persistir `TurnoEmpleado.tipoImputadoId` (determinista, no heurística).
- **UX en menú de asignar**: empleado solo aparece en grupos con plazas pendientes (filtro existente se mantiene).
- **Export caja**: solo Excel por ahora (PDF queda fuera de scope).
- **Quitar nóminas**: solo dashboard widget + entidad excluida de AuditLog (alcance mínimo; `/caja/nominas` sigue funcionando).

Resultado esperado: empleados pueden tener varios tipos y aparecer en cada grupo correspondiente al asignar a turnos; se puede exportar XLSX desde caja; el dashboard se limpia de KPI de nóminas; las tablas de turnos pierden la columna duración.

## Decisiones técnicas resueltas (Arquitecto)

- **Backfill SQL — IMPORTANTE**: NO usar `gen_random_uuid()::text`. Reusar la función `pg_temp.gen_cuid()` ya escrita en [app/prisma/migrations/20260510120000_tipo_empleado_cuid_ids/migration.sql](app/prisma/migrations/20260510120000_tipo_empleado_cuid_ids/migration.sql) (líneas 21-58). El proyecto valida IDs con `z.string().cuid()` en Zod; UUIDs (36 chars) rompen las server actions. Copiar la función al inicio de la migración nueva.
- **Renombrar campo en types**: `AsignacionSerializable.tipoEmpleadoId` → `tipoImputadoId` en [app/src/app/(app)/turnos/types.ts](app/src/app/(app)/turnos/types.ts). Cambia la semántica (de "tipo único del empleado" → "tipo en el que se cuenta esta asignación"); renombrar fuerza al compilador a marcar todos los usos y evita divergencia silenciosa.
- **Política de export**: las 3 rutas `/caja/{cierres,gastos,nominas}/exportar` siguen el patrón exacto de [app/src/app/(app)/turnos/asistencias/exportar/route.ts](app/src/app/(app)/turnos/asistencias/exportar/route.ts) — edición activa por defecto, `?edicionId=` override.

## Sub-fase A — Schema + migración (Tarea 1)

**Bloquea B y C.** Cliente Prisma debe regenerarse antes de tocar código que lo consuma.

- [ ] **A.1** Editar [app/prisma/schema.prisma:162-181](app/prisma/schema.prisma) sobre `Empleado`:
  - Eliminar `tipoEmpleadoId String` (línea 169), relación `tipoEmpleado` (línea 175) y `@@index([tipoEmpleadoId])` (línea 180).
  - Añadir relación `tipos EmpleadoTipo[]`.
  - Añadir campo `esVoluntario Boolean @default(false)`.
  - Actualizar comentarios doc (líneas 159-161): la regla pasa a depender de `esVoluntario`.
- [ ] **A.2** Añadir modelo `EmpleadoTipo`:
  - `id String @id @default(cuid())`, `empleadoId String`, `tipoEmpleadoId String`, `createdAt DateTime @default(now())`.
  - Relaciones: `empleado` con `onDelete: Cascade`, `tipoEmpleado` con `onDelete: Restrict`.
  - `@@unique([empleadoId, tipoEmpleadoId])`, `@@index([tipoEmpleadoId])`.
- [ ] **A.3** En `TipoEmpleado` añadir relación inversa `empleadoTipos EmpleadoTipo[]`.
- [ ] **A.4** Añadir relación inversa en `Empleado` ya cubierta por A.1.
- [ ] **A.5** Editar [app/prisma/schema.prisma](app/prisma/schema.prisma) sobre `TurnoEmpleado` (líneas 223-236): añadir `tipoImputadoId String` con `@relation` a `TipoEmpleado` (sin cascade) y `@@index([tipoImputadoId])`.
- [ ] **A.6** Crear migración con `npx prisma migrate dev --create-only --name multi_tipo_empleado_y_imputacion`. Editar el SQL generado para insertar el bloque de backfill ANTES de los `DROP COLUMN`:
  ```sql
  -- 1) Definir pg_temp.gen_cuid() copiada de migrations/20260510120000_tipo_empleado_cuid_ids/migration.sql:21-58
  -- 2) Backfill EmpleadoTipo desde Empleado.tipoEmpleadoId
  INSERT INTO "EmpleadoTipo" ("id","empleadoId","tipoEmpleadoId","createdAt")
  SELECT pg_temp.gen_cuid(), e."id", e."tipoEmpleadoId", NOW()
  FROM "Empleado" e
  WHERE e."tipoEmpleadoId" IS NOT NULL;
  -- 3) Backfill Empleado.esVoluntario desde regla actual
  UPDATE "Empleado" SET "esVoluntario" = ("jornalDiario" IS NULL);
  -- 4) Backfill TurnoEmpleado.tipoImputadoId desde el tipo único actual del empleado
  UPDATE "TurnoEmpleado" te
  SET "tipoImputadoId" = e."tipoEmpleadoId"
  FROM "Empleado" e WHERE te."empleadoId" = e."id";
  -- 5) Solo después: DROP de Empleado_tipoEmpleadoId_idx y Empleado.tipoEmpleadoId
  ```
- [ ] **A.7** Aplicar la migración: `npx prisma migrate dev`.
- [ ] **A.8** Regenerar cliente: `npx prisma generate`. **Reiniciar `npm run dev`** (memoria del usuario: cliente Prisma cacheado).

## Sub-fase B — Empleados CRUD adaptado a N:M (Tarea 1)

**Depende de A.** Paralelizable con C.

- [ ] **B.1** Editar [app/src/app/(app)/empleados/schema.ts:38](app/src/app/(app)/empleados/schema.ts): `tipoEmpleadoId` → `tipoIds: z.array(z.string().min(1)).min(1, "Selecciona al menos un tipo")`. Añadir `esVoluntario: z.boolean()`. Replicar en `actualizarEmpleadoSchema`.
- [ ] **B.2** Editar `validarReglaVoluntario` en [app/src/app/(app)/empleados/actions.ts:29-76](app/src/app/(app)/empleados/actions.ts): aceptar `tipoIds: string[]` y `esVoluntario: boolean` directamente del form. Validar que todos los `tipoIds` existen y están activos. La regla "voluntario ⇒ jornal NULL + entidad obligatoria" se aplica con el `esVoluntario` que viene del form (ya no se calcula desde el tipo).
- [ ] **B.3** Editar `crearEmpleadoAction` (mismo archivo): en `prisma.empleado.create`, sustituir `tipoEmpleadoId` por `tipos: { create: data.tipoIds.map(id => ({ tipoEmpleadoId: id })) }` y añadir `esVoluntario: data.esVoluntario`.
- [ ] **B.4** Editar `actualizarEmpleadoAction` (mismo archivo): `set` declarativo en transacción — `tipos: { deleteMany: {}, create: [...] }`, actualizar `esVoluntario`.
- [ ] **B.5** Editar [app/src/app/(app)/empleados/_components/empleado-form.tsx:139-186](app/src/app/(app)/empleados/_components/empleado-form.tsx): radio buttons → checkboxes (`name="tipoIds"`, múltiples). Añadir checkbox visible para `esVoluntario` con default sugerido por "alguno seleccionado es voluntario" pero modificable por el usuario.
- [ ] **B.6** Adaptar páginas de listado/detalle de empleado: [app/src/app/(app)/empleados/page.tsx](app/src/app/(app)/empleados/page.tsx), [app/src/app/(app)/empleados/[id]/page.tsx](app/src/app/(app)/empleados/[id]/page.tsx), [app/src/app/(app)/empleados/_components/empleado-card.tsx](app/src/app/(app)/empleados/_components/empleado-card.tsx): cambiar `include: { tipoEmpleado: true }` → `include: { tipos: { include: { tipoEmpleado: true } } }`. Renderizar lista de chips de tipos (no nombre único).

## Sub-fase C — Turnos: multi-tipo + tipo imputado (Tarea 1)

**Depende de A.** Paralelizable con B (archivos disjuntos salvo `types.ts`).

- [ ] **C.1** Editar [app/src/app/(app)/turnos/types.ts](app/src/app/(app)/turnos/types.ts):
  - `EmpleadoMin`: `tipoEmpleadoId: string` → `tipoEmpleadoIds: string[]` y añadir `esVoluntario: boolean`.
  - `AsignacionSerializable.tipoEmpleadoId` → `tipoImputadoId` (renombre intencional para que TS marque todos los usos).
- [ ] **C.2** Editar [app/src/app/(app)/turnos/_lib/loader.ts:184](app/src/app/(app)/turnos/_lib/loader.ts):
  - Empleados disponibles: `select` con `tipos: { select: { tipoEmpleadoId: true } }` y `esVoluntario`. Mapear a `tipoEmpleadoIds: e.tipos.map(t => t.tipoEmpleadoId)`.
  - Asignaciones del turno: leer `tipoImputadoId` directamente (ya viene de schema), no de `empleado.tipoEmpleadoId`.
- [ ] **C.3** Editar [app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx:74-82](app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx): `e.tipoEmpleadoId === tipo.id` → `e.tipoEmpleadoIds.includes(tipo.id)`. El empleado aparece en cada grupo con plazas pendientes que coincida con sus tipos. **Solo donde haya plaza** — el filtro existente que oculta grupos llenos se conserva.
- [ ] **C.4** En el mismo archivo (líneas ~150-165 según el form interno): añadir `<input type="hidden" name="tipoImputadoId" value={tipo.id} />` dentro del form de cada grupo. Es el tipo del grupo desde el que se hace clic.
- [ ] **C.5** Editar `asignarEmpleadoAction` en [app/src/app/(app)/turnos/actions.ts:287-330](app/src/app/(app)/turnos/actions.ts):
  - Aceptar `tipoImputadoId` en el Zod schema del form.
  - Validar que `tipoImputadoId` está en los tipos del empleado (`prisma.empleadoTipo.findFirst({ where: { empleadoId, tipoEmpleadoId: tipoImputadoId } })`).
  - Persistir en `prisma.turnoEmpleado.create` el campo `tipoImputadoId`.
- [ ] **C.6** Editar [app/src/app/(app)/turnos/_components/BloqueTurno.tsx:53-58](app/src/app/(app)/turnos/_components/BloqueTurno.tsx): `asignadosPorTipo` lee ahora `a.tipoImputadoId` (renombrado). Compilador guía el cambio gracias a C.1.
- [ ] **C.7** Adaptar consumidores de `tipoEmpleadoId` sobre Empleado/Asignación que el compilador marque tras C.1. Lista esperada (verificada por Explorador):
  - [app/src/app/(app)/admin/solicitudes/actions.ts](app/src/app/(app)/admin/solicitudes/actions.ts)
  - [app/src/app/(app)/turnos/asistencias/page.tsx](app/src/app/(app)/turnos/asistencias/page.tsx)
  - [app/src/app/(app)/turnos/asistencias/_lib/query.ts](app/src/app/(app)/turnos/asistencias/_lib/query.ts)
  - [app/src/app/(app)/turnos/asistencias/exportar/route.ts](app/src/app/(app)/turnos/asistencias/exportar/route.ts)
  - [app/src/app/(app)/turnos/_lib/perfiles.ts](app/src/app/(app)/turnos/_lib/perfiles.ts), [_lib/huecos.ts](app/src/app/(app)/turnos/_lib/huecos.ts)
  - [app/src/app/(app)/turnos/_components/ResumenVacantes.tsx](app/src/app/(app)/turnos/_components/ResumenVacantes.tsx), [BandaResumen.tsx](app/src/app/(app)/turnos/_components/BandaResumen.tsx), [DialogoNuevoTurno.tsx](app/src/app/(app)/turnos/_components/DialogoNuevoTurno.tsx), [DialogoEditarTurno.tsx](app/src/app/(app)/turnos/_components/DialogoEditarTurno.tsx)
  - [app/src/app/(app)/turnos/exportar/{semana,empleado,dia,semana-global}/page.tsx](app/src/app/(app)/turnos/exportar/)
  - [app/src/app/(app)/admin/mantenimiento/_components/DialogoRellenarPlazas.tsx](app/src/app/(app)/admin/mantenimiento/_components/DialogoRellenarPlazas.tsx)
  - Heurística: filtro contra tipo (empleado pertenece) → `.tipoEmpleadoIds.includes(...)`. Imputación a tipo (asignación) → `tipoImputadoId`.
- [ ] **C.8** Actualizar fixtures en [app/src/test/fixtures.ts](app/src/test/fixtures.ts).

## Sub-fase D — Quitar columna duración (Tarea 2)

**Sin dependencias.** Paralelizable con A/B/C/E/G.

- [ ] **D.1** [app/src/app/(app)/turnos/_components/BloqueTurno.tsx](app/src/app/(app)/turnos/_components/BloqueTurno.tsx): quitar import `duracionHoras` (línea 13), borrar `const duracion = duracionHoras(...)` (línea 37), quitar `{duracion}h ·` del JSX (línea 95).
- [ ] **D.2** [app/src/app/(app)/turnos/imprimir/page.tsx](app/src/app/(app)/turnos/imprimir/page.tsx): quitar import (línea 6), borrar `<th>Duración</th>` cerca de la cabecera y `<td>{duracionHoras(...)}h</td>` (línea 112).
- [ ] **D.3** [app/src/app/(app)/turnos/exportar/dia/page.tsx](app/src/app/(app)/turnos/exportar/dia/page.tsx): quitar import (línea 13), borrar `<th>Duración</th>` (línea 68) y celda `{duracionHoras(...)}h` (línea 154).
- [ ] **D.4** [app/src/app/(app)/turnos/exportar/semana/page.tsx](app/src/app/(app)/turnos/exportar/semana/page.tsx): quitar import (línea 9), borrar `<th>Duración</th>` (línea 94) y celda (línea 150).
- [ ] **D.5** [app/src/app/(app)/turnos/exportar/empleado/page.tsx](app/src/app/(app)/turnos/exportar/empleado/page.tsx): **mantener** import (se usa para total). Borrar solo `<th>Duración</th>` (línea 106) y celda (línea 120). Línea 137 (`{totalHoras}h`) se mantiene — es el agregado total, no la columna por turno.
- [ ] **D.6** No tocar [app/src/app/(app)/turnos/_lib/fechas.ts:90-93](app/src/app/(app)/turnos/_lib/fechas.ts) — `duracionHoras` sigue usándose para totales.

## Sub-fase E — Export Excel de caja (Tarea 3)

**Sin dependencias.** Paralelizable con A/B/C/D/G.

Patrón guía: [app/src/app/(app)/turnos/asistencias/exportar/route.ts](app/src/app/(app)/turnos/asistencias/exportar/route.ts) (ExcelJS, ya en `package.json:28`).

- [ ] **E.1** Crear `app/src/app/(app)/caja/cierres/exportar/route.ts`:
  - GET con `requireRole(["admin","gerente","cajero"])`.
  - `edicionId` desde `?edicionId=` o `obtenerEdicionActiva()`. 400 si no hay.
  - Query: `prisma.cierreDiario.findMany({ where: { edicionId }, include: { caseta: { select: { nombre: true } } }, orderBy: [{ fecha: "asc" }, { caseta: { nombre: "asc" } }] })`.
  - Workbook "Cierres". Columnas: Fecha (`yyyy-mm-dd`), Caseta, Ingresos (`#,##0.00 "€"`), Estado (bloqueada/abierta), Notas. Header bold + freeze + autoFilter.
  - Filename: `cierres-${edicion.anio}-${ts}.xlsx`. Headers `Cache-Control: no-store` y `Content-Disposition: attachment`.
- [ ] **E.2** Crear `app/src/app/(app)/caja/gastos/exportar/route.ts`:
  - Mismo patrón. Aceptar `?casetaId=` (incluye `central` como `null` igual que [page.tsx:64-68](app/src/app/(app)/caja/gastos/page.tsx)).
  - Columnas: Fecha, Caseta, Categoría (usar `CATEGORIA_LABEL`), Monto, Descripción.
  - Filename: `gastos-${edicion.anio}-${ts}.xlsx`.
- [ ] **E.3** Crear `app/src/app/(app)/caja/nominas/exportar/route.ts`:
  - `requireRole(["admin","gerente","cajero"])`.
  - Query: `prisma.nomina.findMany({ where: { edicionId }, include: { empleado: { select: { nombre: true, dni: true } } } })`.
  - Columnas: Empleado, DNI, Días trabajados, Jornal aplicado, Total, Pagada (sí/no), Fecha pago.
  - Filename: `nominas-${edicion.anio}-${ts}.xlsx`.
- [ ] **E.4** Añadir botón "Exportar Excel" en [app/src/app/(app)/caja/cierres/page.tsx](app/src/app/(app)/caja/cierres/page.tsx) — `<a href="/caja/cierres/exportar">` con estilo de botón secundario, junto al header existente.
- [ ] **E.5** Añadir botón "Exportar Excel" en [app/src/app/(app)/caja/gastos/page.tsx](app/src/app/(app)/caja/gastos/page.tsx). Si hay filtro de caseta activo, propagar: `?casetaId=${activo}`.
- [ ] **E.6** Añadir botón "Exportar Excel" en [app/src/app/(app)/caja/nominas/page.tsx](app/src/app/(app)/caja/nominas/page.tsx) cerca del bloque `BotonCalcular` (línea 87).

## Sub-fase F — Verificar edición activa en caja (Tarea 4)

**Verificación, no código.** Paralelizable con todo.

- [ ] **F.1** Auditar las 4 páginas y confirmar que **todas** las queries Prisma incluyen `where: { edicionId: edicion.id }`:
  - [app/src/app/(app)/caja/cierres/page.tsx:62-66](app/src/app/(app)/caja/cierres/page.tsx) ✅ (verificado)
  - [app/src/app/(app)/caja/gastos/page.tsx:70-74](app/src/app/(app)/caja/gastos/page.tsx) ✅
  - [app/src/app/(app)/caja/nominas/page.tsx:59-67](app/src/app/(app)/caja/nominas/page.tsx) ✅
  - [app/src/app/(app)/caja/balance/page.tsx:55-65](app/src/app/(app)/caja/balance/page.tsx) ✅
- [ ] **F.2** Auditar [app/src/app/(app)/caja/{cierres,gastos,nominas}/actions.ts](app/src/app/(app)/caja/) y confirmar que las mutaciones siempre fijan `edicionId` desde `obtenerEdicionActiva()` y nunca aceptan `edicionId` arbitrario por FormData. Reportar hallazgos.

## Sub-fase G — Quitar nóminas de Dashboard + AuditLog (Tarea 5, alcance mínimo)

**Sin dependencias.** Paralelizable con A/B/C/D/E.

- [ ] **G.1** Editar [app/src/lib/audit.ts:6-11](app/src/lib/audit.ts): añadir `"Nomina"` al `Set` `ENTIDADES_EXCLUIDAS`. Las 3 llamadas `withAuditContext` en [app/src/app/(app)/caja/nominas/actions.ts](app/src/app/(app)/caja/nominas/actions.ts) (líneas 81, 159, 193) siguen presentes — solo dejan de escribir en AuditLog.
- [ ] **G.2** Editar [app/src/app/(app)/_lib/dashboard.ts](app/src/app/(app)/_lib/dashboard.ts):
  - Tipo `KpiData` (líneas 22-31): eliminar `nominasEdicion`, `nominasPendientesCount`, `nominasPendientesTotal`.
  - Cálculo (líneas 150-159): eliminar los dos `prisma.nomina` aggregates y ajustar el `Promise.all` + destructuring.
  - Línea 237: `resultadoNeto = ingresosEdicion - gastosEdicion - nominasEdicion` → `resultadoNeto = ingresosEdicion - gastosEdicion`.
  - Líneas 239-247 (objeto `kpis`): eliminar las 3 claves de nómina.
- [ ] **G.3** Editar [app/src/app/(app)/page.tsx:88-91](app/src/app/(app)/page.tsx): borrar `<KpiCard etiqueta="Nóminas · pendientes" ... />`.
- [ ] **G.4** Editar [app/src/app/(app)/page.tsx:84](app/src/app/(app)/page.tsx): cambiar la nota del KpiCard "Neto" de `"Ingresos − gastos − nóminas"` a `"Ingresos − gastos"`.

## Sub-fase H — Tests + verificación final

**Última fase, secuencial al cierre.**

- [ ] **H.1** Adaptar fixtures en [app/src/test/fixtures.ts](app/src/test/fixtures.ts): empleados con `tipos: { create: [...] }` y `esVoluntario`.
- [ ] **H.2** Adaptar tests existentes que rompan tras A-C:
  - [app/src/app/(app)/turnos/actions.test.ts](app/src/app/(app)/turnos/actions.test.ts) — referencias a `tipoEmpleadoId` en empleado/asignación.
  - [app/src/app/(app)/caja/nominas/actions.test.ts](app/src/app/(app)/caja/nominas/actions.test.ts) — confirmar que los tests no exigían escritura en AuditLog. Si la exigían, ajustar.
  - [app/src/app/(app)/caja/cierres/actions.test.ts](app/src/app/(app)/caja/cierres/actions.test.ts) — verificar.
- [ ] **H.3** Añadir test nuevo: empleado con 2 tipos aparece en ambos grupos del filtro de `AsignarEmpleado`. Si no hay test de UI, extraer la función de filtrado a `_lib/agrupar-empleados.ts` y testarla unit.
- [ ] **H.4** Añadir test: `crearEmpleadoAction` con `esVoluntario=true` exige `entidadId` y `jornalDiario=null`; con `esVoluntario=false` exige `jornalDiario` numérico. Archivo: nuevo `app/src/app/(app)/empleados/actions.test.ts`.
- [ ] **H.5** Añadir test: mutación a `Nomina` no genera fila en AuditLog. Archivo: nuevo `app/src/lib/audit.test.ts`.
- [ ] **H.6** Ejecutar desde [app/](app/): `npm run test:back`. Resolver fallos.
- [ ] **H.7** Ejecutar desde [app/](app/): `npm run lint`. Resolver warnings.
- [ ] **H.8** Ejecutar desde [app/](app/): `npm run build`. Resolver fallos de tipo (especialmente del renombre `tipoEmpleadoId` → `tipoImputadoId`).
- [ ] **H.9** Smoke manual con `npm run dev` (reiniciar servidor por cliente Prisma cacheado):
  - Crear empleado con 2 tipos (uno voluntario, uno no). Verificar checkbox `esVoluntario` con default sugerido.
  - `/turnos/semana`: abrir popover de asignar en un turno con plazas de ambos tipos. Confirmar que el empleado aparece en cada grupo. Asignarlo en uno → confirmar que el contador de ese grupo sube y se persiste al recargar (no salta de grupo).
  - Asignar el mismo empleado a otro turno desde un grupo distinto → confirmar que se imputa al tipo del grupo elegido.
  - `/`: confirmar que NO aparece "Nóminas · pendientes". KPI "Neto" suma sin nóminas y nota refleja la fórmula.
  - `/caja/nominas`: pulsar "Calcular" → confirmar que NO aparece nueva fila en `/admin/auditoria` (o la vista equivalente).
  - Pulsar "Exportar Excel" en `/caja/cierres`, `/caja/gastos`, `/caja/nominas` → descargar y abrir el XLSX.

## Paralelización

```
Tiempo →

[A: schema + migración]──────┐
                             ↓
                         [B: empleados] ─┐
                         [C: turnos] ────┤
                                         │
[D: duración]────────────────────────────┤
[E: export caja]─────────────────────────┤
[F: verificar edición]───────────────────┤
[G: dashboard + audit]───────────────────┤
                                         ↓
                                  [H: tests + verify]
```

- **A es bloqueante** para B y C (cliente Prisma debe regenerarse).
- **B y C en paralelo** tras A. Coordinar el toque a [turnos/types.ts](app/src/app/(app)/turnos/types.ts) y [test/fixtures.ts](app/src/test/fixtures.ts) — son archivos compartidos.
- **D, E, F, G en paralelo** entre sí y con A/B/C (no tocan empleados ni turnos salvo en zonas disjuntas).
- **H al final**, una vez todo lo anterior está mergeado.

Recomendación de despacho con `subagent-driven-development`: 4 subagentes paralelos `[A→B+C]`, `D`, `E`, `G`. F y H las ejecuta el coordinador.

## Plan de tests

| Caso | Tipo | Archivo destino |
|---|---|---|
| Empleado con 2 tipos aparece en ambos grupos en `AsignarEmpleado` | unit | extraer función de agrupación a `app/src/app/(app)/turnos/_lib/agrupar-empleados.ts` (nuevo) + test |
| `crearEmpleadoAction`: `esVoluntario=true` exige `entidadId` y `jornalDiario=null` | integration | `app/src/app/(app)/empleados/actions.test.ts` (nuevo) |
| `asignarEmpleadoAction` rechaza `tipoImputadoId` que el empleado no tiene | integration | extender `app/src/app/(app)/turnos/actions.test.ts` |
| Migración: empleado existente conserva su tipo y `esVoluntario` derivado | manual smoke | H.9 (verificación visual) |
| Mutación a `Nomina` NO escribe en `AuditLog` | unit | `app/src/lib/audit.test.ts` (nuevo) |
| Dashboard `KpiData` no incluye claves de nómina | type-check | implícito en `npm run build` |
| Export Excel de cierres devuelve XLSX con `Content-Type` y filas correctas | integration opcional | `app/src/app/(app)/caja/cierres/exportar/route.test.ts` |
| Páginas `/caja/*` filtran por edición activa | revisión manual | F.1 (sin código) |

## Archivos críticos

- [app/prisma/schema.prisma](app/prisma/schema.prisma)
- [app/prisma/migrations/](app/prisma/migrations/) (nueva migración)
- [app/src/app/(app)/empleados/actions.ts](app/src/app/(app)/empleados/actions.ts)
- [app/src/app/(app)/empleados/_components/empleado-form.tsx](app/src/app/(app)/empleados/_components/empleado-form.tsx)
- [app/src/app/(app)/turnos/types.ts](app/src/app/(app)/turnos/types.ts)
- [app/src/app/(app)/turnos/_lib/loader.ts](app/src/app/(app)/turnos/_lib/loader.ts)
- [app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx](app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx)
- [app/src/app/(app)/turnos/_components/BloqueTurno.tsx](app/src/app/(app)/turnos/_components/BloqueTurno.tsx)
- [app/src/app/(app)/turnos/actions.ts](app/src/app/(app)/turnos/actions.ts)
- [app/src/app/(app)/_lib/dashboard.ts](app/src/app/(app)/_lib/dashboard.ts)
- [app/src/app/(app)/page.tsx](app/src/app/(app)/page.tsx)
- [app/src/lib/audit.ts](app/src/lib/audit.ts)

## Riesgos

- **Migración destructiva**: el `DROP COLUMN tipoEmpleadoId` debe ir DESPUÉS del backfill. Validar primero en branch Neon `dev`.
- **Cliente Prisma cacheado**: tras `migrate dev` + `generate`, **reiniciar `npm run dev`** (memoria del usuario lo confirma como tropezón habitual).
- **Cascada `tipoEmpleadoId`**: ~30 archivos matchean. Algunos son `TurnoPlaza.tipoEmpleadoId` (que NO cambia) — distinguir caso a caso.
- **Renombre `AsignacionSerializable.tipoEmpleadoId → tipoImputadoId`**: intencional para que el compilador guíe; revisar todos los errores de TS antes de continuar.
- **Backfill SQL**: NO usar `gen_random_uuid()::text` (rompe Zod cuid). Reusar `pg_temp.gen_cuid()` de migración previa.
- **AuditLog histórico**: añadir `Nomina` a `ENTIDADES_EXCLUIDAS` no borra logs antiguos. Si se quiere limpieza retroactiva, es tarea separada (no en alcance mínimo).

## Verificación end-to-end (resumen ejecutable)

Desde [app/](app/):

```bash
npm run lint
npm run test:back
npm run build
npm run dev   # smoke manual de H.9
```

Después: usar la skill `close-development` para PR + scale-down + Jira (si aplica).
