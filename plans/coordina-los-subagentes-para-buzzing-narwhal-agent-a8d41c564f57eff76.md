# Plan analista — buzzing narwhal

> Análisis de tareas atómicas para los 5 frentes solicitados, anclado al output del Explorador y a verificación spot-check de archivos.

## Tareas atómicas

### Sub-fase A — Schema + migración (Tarea 1: multi-tipo empleado)

- [ ] **A.1** Editar [app/prisma/schema.prisma](app/prisma/schema.prisma:162-181) sobre el modelo `Empleado`:
  - Eliminar campo `tipoEmpleadoId String` (línea 169) y la relación `tipoEmpleado TipoEmpleado @relation(...)` (línea 175).
  - Eliminar el `@@index([tipoEmpleadoId])` (línea 180).
  - Añadir relación `tipos EmpleadoTipo[]` al modelo `Empleado`.
  - **[DECISIÓN PENDIENTE — voluntario]**: ver bloque "Decisiones pendientes" (P1). El plan asume opción **(c) campo nuevo `Empleado.esVoluntario Boolean`** independiente, derivado en backfill desde el tipo actual. Si se decide otra opción, ajustar A.1 antes de migrar.
- [ ] **A.2** En el mismo fichero, añadir el modelo intermedio `EmpleadoTipo`:
  - Campos: `id String @id @default(cuid())`, `empleadoId String`, `tipoEmpleadoId String`, `createdAt DateTime @default(now())`.
  - Relaciones a `Empleado` y `TipoEmpleado` con `onDelete: Cascade` (en empleadoId) y `Restrict` (en tipoEmpleadoId — coherente con la relación 1:1 actual línea 175).
  - `@@unique([empleadoId, tipoEmpleadoId])` y `@@index([tipoEmpleadoId])`.
- [ ] **A.3** En `TipoEmpleado` (verificar localización en el mismo schema), añadir relación inversa `empleadoTipos EmpleadoTipo[]`.
- [ ] **A.4** Editar comentario doc del modelo `Empleado` (líneas 159-161): la regla "tipoEmpleado.esVoluntario ⇔ jornal NULL + entidad NOT NULL" pasa a depender de `Empleado.esVoluntario` (no del tipo). Reescribir las dos líneas de comentario.
- [ ] **A.5** Crear migración SQL manual: ejecutar `npx prisma migrate dev --create-only --name add_empleado_tipos_nm` y editar el SQL generado para incluir backfill antes del `DROP COLUMN`:
  ```sql
  -- 1. crear tabla EmpleadoTipo
  -- 2. INSERT INTO "EmpleadoTipo" (id, empleadoId, tipoEmpleadoId, createdAt)
  --    SELECT gen_random_uuid()::text, id, "tipoEmpleadoId", NOW() FROM "Empleado";
  -- 3. ALTER TABLE "Empleado" ADD COLUMN "esVoluntario" BOOLEAN NOT NULL DEFAULT false;
  -- 4. UPDATE "Empleado" SET "esVoluntario" = TRUE
  --    WHERE "tipoEmpleadoId" IN (SELECT id FROM "TipoEmpleado" WHERE "esVoluntario" = TRUE);
  -- 5. DROP INDEX "Empleado_tipoEmpleadoId_idx"; ALTER TABLE "Empleado" DROP COLUMN "tipoEmpleadoId";
  ```
  Nota: Prisma usa cuid en runtime; aceptar `gen_random_uuid()::text` solo para SQL backfill (los IDs generados a partir de aquí los pone Prisma).
- [ ] **A.6** Aplicar la migración: `npx prisma migrate dev` (sin `--create-only`).
- [ ] **A.7** Regenerar cliente: `npx prisma generate`.

### Sub-fase B — Empleados CRUD adaptado a N:M (Tarea 1)

- [ ] **B.1** Editar [app/src/app/(app)/empleados/schema.ts:38](app/src/app/(app)/empleados/schema.ts): reemplazar `tipoEmpleadoId: z.string().min(1, ...)` por `tipoIds: z.array(z.string().min(1)).min(1, "Selecciona al menos un tipo")`. Aplicar también al `actualizarEmpleadoSchema` (verificar localización en el mismo archivo).
- [ ] **B.2** Editar [app/src/app/(app)/empleados/actions.ts:29-76](app/src/app/(app)/empleados/actions.ts) (`validarReglaVoluntario`):
  - Cambiar firma: aceptar `tipoIds: string[]` en lugar de `tipoEmpleadoId: string`.
  - Cargar todos los tipos: `prisma.tipoEmpleado.findMany({ where: { id: { in: tipoIds }, activo: true } })`. Si `count !== tipoIds.length` → error "Tipo de empleado no válido o inactivo."
  - Determinar `esVoluntario` según política decidida en P1 (asumido en este plan: **alguno voluntario ⇒ empleado voluntario**, alineado con opción (a) de P1; ver Decisiones pendientes para revisar).
- [ ] **B.3** Editar `crearEmpleadoAction` en [app/src/app/(app)/empleados/actions.ts:84-120+](app/src/app/(app)/empleados/actions.ts):
  - Sustituir `data.tipoEmpleadoId` por `data.tipoIds`.
  - En `prisma.empleado.create`: quitar `tipoEmpleadoId`, añadir `esVoluntario: reglaRes.esVoluntario`, y crear `tipos: { create: data.tipoIds.map(id => ({ tipoEmpleadoId: id })) }`.
- [ ] **B.4** Replicar los mismos cambios en `actualizarEmpleadoAction` (verificar línea exacta abajo de `crearEmpleadoAction` en el mismo `actions.ts`): leer tipos actuales, `set` declarativo via `tipos: { deleteMany: {}, create: [...] }` dentro de transacción.
- [ ] **B.5** Editar [app/src/app/(app)/empleados/_components/empleado-form.tsx:139-186](app/src/app/(app)/empleados/_components/empleado-form.tsx):
  - Reemplazar grupo de radio buttons por checkboxes (`type="checkbox" name="tipoIds"`, value=tipo.id) — ojo: convertir a `useState<string[]>` para state, y emitir hidden inputs múltiples con `name="tipoIds"`.
  - Recalcular `esVoluntarioSeleccionado` en el cliente como **alguno seleccionado es voluntario** (mismo criterio que B.2).
- [ ] **B.6** Editar [app/src/app/(app)/empleados/page.tsx](app/src/app/(app)/empleados/page.tsx) y [app/src/app/(app)/empleados/[id]/page.tsx](app/src/app/(app)/empleados/[id]/page.tsx) y [app/src/app/(app)/empleados/_components/empleado-card.tsx](app/src/app/(app)/empleados/_components/empleado-card.tsx): cambiar `include: { tipoEmpleado: true }` por `include: { tipos: { include: { tipoEmpleado: true } } }` y adaptar render (lista de chips de tipo en lugar de un único nombre). Reemplazar usos de `empleado.tipoEmpleadoId`/`empleado.tipoEmpleado` por `empleado.tipos[].tipoEmpleado`.

### Sub-fase C — UI asignar a turnos con multi-tipo (Tarea 1)

- [ ] **C.1** Editar tipo `EmpleadoMin` en [app/src/app/(app)/turnos/types.ts](app/src/app/(app)/turnos/types.ts): cambiar `tipoEmpleadoId: string` por `tipoEmpleadoIds: string[]` y `esVoluntario: boolean` (si no estaba ya — verificar).
- [ ] **C.2** Editar [app/src/app/(app)/turnos/_lib/loader.ts](app/src/app/(app)/turnos/_lib/loader.ts): cambiar el `select`/`include` de empleados disponibles para traer `tipos: { select: { tipoEmpleadoId: true } }` y `esVoluntario`. Mapear en serializable a `tipoEmpleadoIds: e.tipos.map(t => t.tipoEmpleadoId)`.
- [ ] **C.3** Editar [app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx:74-82](app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx): cambiar el filter por `e.tipoEmpleadoIds.includes(tipo.id)`. Esto hace que un empleado con varios tipos aparezca en cada uno de sus grupos. **OJO regla de plazas**: hoy `asignados` cuenta `TurnoEmpleado` por tipo (línea 80 — `asignadosPorTipo[tipo.id]`); con N:M un empleado asignado solo crea UNA fila `TurnoEmpleado` y NO sabemos a qué tipo "imputarlo". Resolver según P3 (ver Decisiones pendientes).
- [ ] **C.4** Editar [app/src/app/(app)/turnos/_components/BloqueTurno.tsx:41-65](app/src/app/(app)/turnos/_components/BloqueTurno.tsx): el cálculo `asignadosPorTipo` lee `a.tipoEmpleadoId` de la asignación. Hoy esto viene heredado del empleado en el loader. Adaptar al modelo nuevo según P3.
- [ ] **C.5** Buscar y adaptar otros usos de `tipoEmpleadoId` sobre Empleado (no sobre TurnoPlaza) en los 30 archivos que matchearon en Grep:
  - [app/src/app/(app)/admin/solicitudes/actions.ts](app/src/app/(app)/admin/solicitudes/actions.ts)
  - [app/src/app/(app)/turnos/asistencias/page.tsx](app/src/app/(app)/turnos/asistencias/page.tsx)
  - [app/src/app/(app)/turnos/asistencias/_lib/query.ts](app/src/app/(app)/turnos/asistencias/_lib/query.ts)
  - [app/src/app/(app)/turnos/asistencias/exportar/route.ts](app/src/app/(app)/turnos/asistencias/exportar/route.ts) (filtro por tipos en query string)
  - [app/src/app/(app)/turnos/_lib/perfiles.ts](app/src/app/(app)/turnos/_lib/perfiles.ts)
  - [app/src/app/(app)/turnos/_lib/huecos.ts](app/src/app/(app)/turnos/_lib/huecos.ts)
  - [app/src/app/(app)/turnos/_components/ResumenVacantes.tsx](app/src/app/(app)/turnos/_components/ResumenVacantes.tsx)
  - [app/src/app/(app)/turnos/_components/DialogoNuevoTurno.tsx](app/src/app/(app)/turnos/_components/DialogoNuevoTurno.tsx)
  - [app/src/app/(app)/turnos/_components/DialogoEditarTurno.tsx](app/src/app/(app)/turnos/_components/DialogoEditarTurno.tsx)
  - [app/src/app/(app)/turnos/_components/BandaResumen.tsx](app/src/app/(app)/turnos/_components/BandaResumen.tsx)
  - [app/src/app/(app)/turnos/exportar/{semana,empleado,dia,semana-global}/page.tsx](app/src/app/(app)/turnos/exportar)
  - [app/src/app/(app)/admin/mantenimiento/_components/DialogoRellenarPlazas.tsx](app/src/app/(app)/admin/mantenimiento/_components/DialogoRellenarPlazas.tsx)
  - [app/src/test/fixtures.ts](app/src/test/fixtures.ts) — actualizar fixtures de empleados.

  Heurística: si el `tipoEmpleadoId` se usa como filtro contra un tipo (`empleado.tipoEmpleadoId === ...`), reemplazar por `empleado.tipoEmpleadoIds.includes(...)`. Si se usa para imputar a UN tipo (p. ej. `TurnoPlaza`), revisar caso a caso.
- [ ] **C.6** Editar [app/src/app/(app)/turnos/actions.ts:287-330+](app/src/app/(app)/turnos/actions.ts) (`asignarEmpleadoAction`): no requiere cambio estructural (sigue creando `TurnoEmpleado` 1:1). Verificar que cualquier validación de "tipo del empleado vs plazas" es consistente con la decisión P3.

### Sub-fase D — Quitar columna duración (Tarea 2)

- [ ] **D.1** Editar [app/src/app/(app)/turnos/_components/BloqueTurno.tsx](app/src/app/(app)/turnos/_components/BloqueTurno.tsx):
  - Línea 13: quitar `duracionHoras` del import.
  - Línea 37: borrar `const duracion = duracionHoras(...);`.
  - Líneas 95-96: cambiar `{duracion}h · {turno.asignaciones.length} {...}` por `{turno.asignaciones.length} {...}`.
- [ ] **D.2** Editar [app/src/app/(app)/turnos/imprimir/page.tsx](app/src/app/(app)/turnos/imprimir/page.tsx):
  - Línea 6: quitar `duracionHoras` del import.
  - Línea 112 (`<td>{duracionHoras(...)}h</td>`): borrar la celda. Borrar también el `<th>Duración</th>` correspondiente (verificar línea — probablemente cerca de la cabecera de la tabla).
- [ ] **D.3** Editar [app/src/app/(app)/turnos/exportar/dia/page.tsx](app/src/app/(app)/turnos/exportar/dia/page.tsx):
  - Línea 13: quitar `duracionHoras` del import.
  - Línea 68: borrar `<th style={{ width: 80 }}>Duración</th>`.
  - Línea 154: borrar la `<td>` con `{duracionHoras(...)}h`.
- [ ] **D.4** Editar [app/src/app/(app)/turnos/exportar/semana/page.tsx](app/src/app/(app)/turnos/exportar/semana/page.tsx):
  - Línea 9: quitar `duracionHoras` del import.
  - Línea 94: borrar `<th>Duración</th>`.
  - Línea 150: borrar la celda `{duracionHoras(...)}h`.
- [ ] **D.5** Editar [app/src/app/(app)/turnos/exportar/empleado/page.tsx](app/src/app/(app)/turnos/exportar/empleado/page.tsx):
  - Línea 9: **mantener** `duracionHoras` (se usa en línea 40 para el total de horas y en 137 para el footer "Total").
  - Línea 106: borrar `<th>Duración</th>`.
  - Línea 120: borrar la `<td>` con `{duracionHoras(...)}h`.
  - Línea 137 (`{totalHoras}h`): mantener — es el agregado, no la columna por turno.
- [ ] **D.6** No tocar [app/src/app/(app)/turnos/_lib/fechas.ts:90-93](app/src/app/(app)/turnos/_lib/fechas.ts) (`duracionHoras` sigue usándose en empleado-page para el total).

### Sub-fase E — Export Excel de caja (Tarea 3)

> Patrón guía: [app/src/app/(app)/turnos/asistencias/exportar/route.ts](app/src/app/(app)/turnos/asistencias/exportar/route.ts). ExcelJS ya en `package.json:28`.

- [ ] **E.1** Crear `app/src/app/(app)/caja/cierres/exportar/route.ts`:
  - GET handler con `requireRole(["admin","gerente","cajero"])`.
  - Resolver `edicionId` desde query o `obtenerEdicionActiva()`. Si no hay → 400.
  - Query Prisma: `prisma.cierreDiario.findMany({ where: { edicionId }, include: { caseta: { select: { nombre: true } } }, orderBy: [{ fecha: "asc" }, { caseta: { nombre: "asc" } }] })`.
  - Workbook con worksheet "Cierres". Columnas: Fecha, Caseta, Ingresos totales, Estado (bloqueada/abierta), Notas (verificar campos en `CierreDiario` del schema). Header bold + freeze + autoFilter como en patrón.
  - `numFmt` para fechas (`yyyy-mm-dd`) y EUR (`#,##0.00 "€"`).
  - Filename: `cierres-${anio}-${ts}.xlsx`.
- [ ] **E.2** Crear `app/src/app/(app)/caja/gastos/exportar/route.ts`:
  - Mismo patrón. Aceptar query params `casetaId` (incluye `central` como `casetaId: null` igual que [page.tsx:64-68](app/src/app/(app)/caja/gastos/page.tsx)).
  - Columnas: Fecha, Caseta, Categoría (usar `CATEGORIA_LABEL`), Monto, Descripción.
  - Filename: `gastos-${anio}-${ts}.xlsx`.
- [ ] **E.3** Crear `app/src/app/(app)/caja/nominas/exportar/route.ts`:
  - `requireRole(["admin","gerente","cajero"])` (lectura — coherente con [page.tsx:36](app/src/app/(app)/caja/nominas/page.tsx)).
  - Query: `prisma.nomina.findMany({ where: { edicionId }, include: { empleado: { select: { nombre: true, dni: true } } }, orderBy: [...] })` — ver [page.tsx:59-67](app/src/app/(app)/caja/nominas/page.tsx).
  - Columnas: Empleado, DNI, Días trabajados, Jornal aplicado, Total, Pagada (sí/no), Fecha pago.
  - Filename: `nominas-${anio}-${ts}.xlsx`.
- [ ] **E.4** Añadir botón "Exportar Excel" en [app/src/app/(app)/caja/cierres/page.tsx](app/src/app/(app)/caja/cierres/page.tsx) (junto al `actionHref="/caja/cierres/nuevo"` de SectionHeader): añadir un anchor `<a href="/caja/cierres/exportar">` con estilo de botón secundario (revisar el patrón usado en `/turnos/asistencias`, donde ya existe).
- [ ] **E.5** Añadir botón "Exportar Excel" en [app/src/app/(app)/caja/gastos/page.tsx](app/src/app/(app)/caja/gastos/page.tsx). Si hay filtro de caseta activo, propagarlo al href: `/caja/gastos/exportar?casetaId=${...}`.
- [ ] **E.6** Añadir botón "Exportar Excel" en [app/src/app/(app)/caja/nominas/page.tsx](app/src/app/(app)/caja/nominas/page.tsx) cerca del bloque `BotonCalcular` (línea 87).

### Sub-fase F — Verificar edición activa en caja (Tarea 4)

- [ ] **F.1** Auditar las 4 páginas y reportar hallazgos en este plan:
  - [app/src/app/(app)/caja/cierres/page.tsx:62-66](app/src/app/(app)/caja/cierres/page.tsx) — verificado: `where: { edicionId: edicion.id }` ✅
  - [app/src/app/(app)/caja/gastos/page.tsx:70-74](app/src/app/(app)/caja/gastos/page.tsx) — verificado: `where: { edicionId: edicion.id, ...filtroWhere }` ✅
  - [app/src/app/(app)/caja/nominas/page.tsx:59-67](app/src/app/(app)/caja/nominas/page.tsx) — verificado: `where: { edicionId: edicion.id }` ✅
  - [app/src/app/(app)/caja/balance/page.tsx:55-65](app/src/app/(app)/caja/balance/page.tsx) — verificado: `whereCierres = { edicionId, ... }` y `whereGastos = { edicionId, ... }` ✅
  - **Conclusión**: ya está implementado. La tarea es solo confirmar al usuario que no se requiere código y dejar constancia. Verificar adicionalmente que las acciones server (POST en `actions.ts` de cada subruta) también respetan el filtro.
- [ ] **F.2** (Recomendado, opcional) Revisar [app/src/app/(app)/caja/cierres/actions.ts](app/src/app/(app)/caja/cierres/actions.ts), `gastos/actions.ts`, `nominas/actions.ts`: confirmar que mutaciones siempre fijan `edicionId` desde `obtenerEdicionActiva()` y no aceptan edicionId arbitrario por FormData.

### Sub-fase G — Quitar nóminas de Dashboard + AuditLog (Tarea 5, scope mínimo)

- [ ] **G.1** Editar [app/src/lib/audit.ts:6-11](app/src/lib/audit.ts): añadir `"Nomina"` al `Set` de `ENTIDADES_EXCLUIDAS`. Esto silencia automáticamente las escrituras de nóminas que entran por las llamadas `withAuditContext` en [caja/nominas/actions.ts:81,159,193](app/src/app/(app)/caja/nominas/actions.ts) sin tocar las acciones (siguen funcionando, solo no escriben en AuditLog).
- [ ] **G.2** Editar [app/src/app/(app)/_lib/dashboard.ts](app/src/app/(app)/_lib/dashboard.ts):
  - Líneas 23-31 (tipo `KpiData`): eliminar `nominasEdicion`, `nominasPendientesCount`, `nominasPendientesTotal`.
  - Líneas 150-159 (dos aggregates de `prisma.nomina`): eliminar y ajustar el array de `Promise.all` y su destructuring de variables (`nominasAgg`, `nominasPendientes`).
  - Línea 235-236: eliminar `nominasEdicion` y `nominasPendientesTotal`.
  - **Línea 237**: cambiar `const resultadoNeto = ingresosEdicion - gastosEdicion - nominasEdicion;` → `const resultadoNeto = ingresosEdicion - gastosEdicion;` (alcance mínimo según el usuario).
  - Líneas 239-247 (objeto `kpis`): eliminar las 3 claves de nómina.
- [ ] **G.3** Editar [app/src/app/(app)/page.tsx:87-92](app/src/app/(app)/page.tsx): borrar el `<KpiCard etiqueta="Nóminas · pendientes" ... />`. Mantener el bloque `Gastos · edición` y `Neto`.
- [ ] **G.4** Editar la `nota` del KpiCard "Neto" en [app/src/app/(app)/page.tsx:84](app/src/app/(app)/page.tsx): cambiar `"Ingresos − gastos − nóminas"` por `"Ingresos − gastos"` (debe coincidir con la fórmula en G.2).

### Sub-fase H — Tests + verificación final

- [ ] **H.1** Actualizar [app/src/test/fixtures.ts](app/src/test/fixtures.ts): adaptar fixtures de Empleado para incluir `tipos: { create: [...] }` o `esVoluntario` en lugar de `tipoEmpleadoId`.
- [ ] **H.2** Revisar y adaptar [app/src/app/(app)/turnos/actions.test.ts](app/src/app/(app)/turnos/actions.test.ts) y [app/src/app/(app)/caja/nominas/actions.test.ts](app/src/app/(app)/caja/nominas/actions.test.ts): cualquier referencia a `tipoEmpleadoId` en empleado debe pasar a `tipos`/`esVoluntario`. En el test de nóminas, verificar que `empleado.jornalDiario === null` sigue siendo el discriminador (no se rompe).
- [ ] **H.3** Añadir caso nuevo en `turnos/actions.test.ts` (o uno nuevo en `_components/AsignarEmpleado.test.ts` si existe — verificar): "empleado con 2 tipos aparece en ambos grupos del menú de asignar". Si no hay test de UI, añadir un test unit sobre la función de agrupación si se extrae a `_lib/`.
- [ ] **H.4** Añadir test sobre `audit.ts`: "una mutación a Nomina no genera fila en AuditLog" — extender [app/src/lib/turnos-solape.test.ts](app/src/lib/turnos-solape.test.ts) o crear `app/src/lib/audit.test.ts` si no existe.
- [ ] **H.5** Ejecutar `npm run test:back` desde `app/`. Resolver fallos.
- [ ] **H.6** Ejecutar `npm run lint` desde `app/`. Resolver warnings/errores.
- [ ] **H.7** Ejecutar `npm run build` desde `app/`. Resolver fallos de tipo.
- [ ] **H.8** Smoke manual con `npm run dev`:
  - Crear empleado con 2 tipos (uno voluntario, uno no — verifica regla P1).
  - Abrir `/turnos/semana`, abrir popover de asignar en un turno con plazas de ambos tipos: confirmar que el empleado aparece en ambos grupos.
  - Asignar el empleado: comprobar que se crea **una sola** fila visible (chip único) y que el contador de plazas se actualiza coherente con la decisión P3.
  - Abrir `/`: comprobar que NO aparece "Nóminas · pendientes". Comprobar que el KPI "Neto" suma sin nóminas.
  - Calcular nóminas en `/caja/nominas`: confirmar que NO aparece nueva fila en `/admin/auditoria` (o donde se vea AuditLog) para entidad `Nomina`.
  - Pulsar "Exportar Excel" en cierres, gastos y nóminas: comprobar descarga válida.

## Paralelización

**Orden lógico:**

1. **A** (schema + migración) — bloquea B y C porque cambia el cliente Prisma.
2. **B** y **C** pueden ejecutarse en paralelo después de A (B = empleados, C = turnos; comparten tipos pero archivos disjuntos). **Riesgo**: si dos subagentes editan `types.ts`/`fixtures.ts` simultáneamente → coordinarlo o serializar.
3. **D**, **E**, **F**, **G** son **paralelas con A/B/C** porque no tocan empleado ni schema:
   - D: solo turnos UI (columna duración).
   - E: solo `/caja/*/exportar/route.ts` nuevos.
   - F: solo lectura/verificación, ningún edit.
   - G: solo `audit.ts`, `dashboard.ts`, `page.tsx` raíz.
4. **H** va al final, una vez que A-G han mergeado.

**Recomendación**: en `subagent-driven-development`, despachar 4 subagentes paralelos: `[A→B+C]`, `D`, `E`, `G`. F la ejecuta el coordinador (es solo verificación). H la ejecuta el coordinador al final.

## Plan de tests

| Caso | Tipo | Archivo destino |
|---|---|---|
| Empleado con 2 tipos aparece en ambos grupos en AsignarEmpleado | unit | `app/src/app/(app)/turnos/_components/AsignarEmpleado.test.ts` (nuevo) o test de la función de agrupación si se extrae a `_lib/agrupar-empleados.ts` |
| `crearEmpleadoAction` con `tipoIds` mixtos (vol + no vol) aplica regla P1 | integration | `app/src/app/(app)/empleados/actions.test.ts` (nuevo o existente) |
| Migración: empleado existente con tipoEmpleadoId voluntario tiene `esVoluntario=true` y una fila en `EmpleadoTipo` | integration manual post-migración | smoke en H.8 |
| Mutación a Nomina NO escribe AuditLog | unit | `app/src/lib/audit.test.ts` (nuevo) |
| `dashboard.ts` no incluye claves de nómina en `KpiData` | type-check | implícito en `npm run build` |
| Export Excel de cierres devuelve XLSX con filas correctas | integration | `app/src/app/(app)/caja/cierres/exportar/route.test.ts` (nuevo, opcional) |
| `obtenerEdicionActiva` filtra correctamente las 4 páginas de caja | revisión manual | F.1 (sin código) |

## Decisiones pendientes

- **[P1] Modelo de "voluntario" en N:M.** El plan asume opción **(c) campo nuevo `Empleado.esVoluntario Boolean`** independiente, derivado en backfill desde `tipoEmpleado.esVoluntario` actual. Justificación: las 3 alternativas tienen pros/contras:
  - (a) "alguno voluntario ⇒ empleado voluntario": derivado, sin campo nuevo, pero se recalcula en cada lectura y no permite que un voluntario añada un tipo no-voluntario sin volverse pagado.
  - (b) "todos voluntarios ⇒ voluntario": demasiado restrictivo.
  - (c) campo explícito `Empleado.esVoluntario`: el usuario decide al crear/editar; el formulario lo deduce por defecto pero permite override. **Más limpio para la regla "voluntario ⇒ jornal NULL + entidad NOT NULL"** ([actions.ts:29-76](app/src/app/(app)/empleados/actions.ts)).
  - **Confirmar antes de A.1.**

- **[P2] Backfill SQL.** Asumido `gen_random_uuid()::text` para los IDs de las filas de `EmpleadoTipo` insertadas en migración. Alternativa: aceptar IDs CUID generados por la app y dejar la tabla vacía hasta que se edite cada empleado (no aceptable, perderíamos datos). **Confirmar uso de `gen_random_uuid` o instalación de extensión `pgcrypto` si no estuviera ya activa en Neon.**

- **[P3] Imputación de empleado a tipo dentro de un turno (UI plazas).** El Explorador dice "aparece en TODOS sus grupos" — si un empleado tiene 3 tipos y hay plazas para 2 de ellos:
  - El empleado aparece como opción seleccionable en cada uno de sus grupos (3 entradas visuales).
  - Al asignarlo, se crea **UN solo** `TurnoEmpleado` (relación 1:1 con `Turno`+`empleado` por unique constraint).
  - **Pregunta**: ¿a qué tipo se "imputa" para el contador de plazas (`asignadosPorTipo` en [BloqueTurno.tsx:53-58](app/src/app/(app)/turnos/_components/BloqueTurno.tsx))?
    - Opción (a): el grupo desde el que se hizo clic — requiere persistir un `tipoImputadoId` en `TurnoEmpleado` (cambio adicional de schema, fuera de scope).
    - Opción (b): el primer tipo del empleado que coincida con plazas pendientes (heurística client-side al renderizar) — sin cambio de schema, pero el contador puede ser inestable si plazas cambian.
    - Opción (c): contar al empleado en TODOS sus tipos (overcount) — rompe la semántica de plazas.
  - **Recomendación**: (b) para no inflar schema. **Confirmar antes de C.3-C.4.** Si se elige (a), añadir tarea adicional de migración para `TurnoEmpleado.tipoImputadoId String?`.

- **[P4] Política de export Excel respecto a la edición.** Asumido: exportar siempre la edición activa salvo que se pase `?edicionId=` explícito (mismo patrón que `/turnos/asistencias/exportar`). **Confirmar.**

## Riesgos

- **Migración destructiva**: el `DROP COLUMN tipoEmpleadoId` debe ir después del backfill. Si la migración se ejecuta en prod sin verificar el backfill primero, se pierde la asociación. Recomendación: ejecutar en branch Neon `dev` y validar antes de aplicar a `main`.
- **Cliente Prisma cacheado**: tras `migrate dev` + `generate`, reiniciar `npm run dev` (ver memory `feedback_reiniciar_dev_server.md`) — TypeScript en el editor también puede cachear tipos antiguos.
- **Cascada de cambios `tipoEmpleadoId` → `tipoEmpleadoIds`**: 30 archivos matchean el patrón. Algunos usos son sobre `TurnoPlaza.tipoEmpleadoId` (que NO cambia) — distinguir en cada caso para no romper TurnoPlaza.
- **`AsignarEmpleado` con N:M y plazas**: la lógica del contador `pendientes = plazas - asignados` (línea 130 de AsignarEmpleado.tsx) depende de P3. Definir antes de tocar.
- **AuditLog histórico**: añadir `Nomina` a `ENTIDADES_EXCLUIDAS` no borra los logs antiguos. Si el usuario quiere limpieza retroactiva, es tarea separada (no en alcance mínimo).
- **Tests `nominas/actions.test.ts`**: si exigen que se escriba en AuditLog, romperán tras G.1. Verificar y ajustar en H.2.
- **Botones de export "Excel"**: verificar que el patrón de UI no usa `<form>` (que dispararía un submit) sino un `<a>` o un `<Link>`. Mantener consistencia con el botón existente en `/turnos/asistencias`.
