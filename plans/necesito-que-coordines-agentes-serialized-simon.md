# Auto-aprobación de solicitudes + semáforo de desempeño

> **Estado**: brainstorming en curso. Este documento se irá rellenando incrementalmente con las decisiones de diseño antes de pasar a `superpowers:writing-plans`.

## Contexto

App `caseta` (Next.js + Prisma + PostgreSQL/Neon, ~2-5 usuarios concurrentes). Hoy el flujo de solicitudes públicas (`/apuntarse/[token]` voluntarios, `/apuntarse-empleado/[token]` empleados) deja **toda solicitud en estado `pendiente`** y obliga a admin/gerente a aprobarlas manualmente desde `/admin/solicitudes`. Con varias ediciones acumuladas, ya hay histórico suficiente como para que **muchas decisiones puedan automatizarse con seguridad**, liberando tiempo humano para los casos dudosos.

Adicionalmente, hoy la asistencia se registra como booleano (`TurnoEmpleado.asistio`) sin matiz cualitativo — necesitamos un sistema **tipo semáforo** que capture el desempeño real (puntualidad, actitud, conflictos) y se acumule entre ediciones para retroalimentar el algoritmo de auto-aprobación.

## Objetivos

1. Reducir el coste manual de aprobar solicitudes en >70% sin pérdida de control.
2. Mantener trazabilidad total: toda decisión automática debe ser revisable y reversible.
3. Generar señal histórica de calidad por persona y por entidad para alimentar futuras decisiones.
4. Respetar inviolablemente las decisiones manuales en días críticos (día grande de la feria, festivos, etc.).

---

## Decisiones de diseño (en construcción)

### 1. Modo de automatización — **Opción B: auto-aprobación con override + bandeja de revisión**

- Si la solicitud cumple las reglas, el sistema fija `estado = aprobada` automáticamente.
- Nuevo campo `decisionAutomatica: boolean` (en `SolicitudVoluntario`, `SolicitudEmpleado` y sus tablas de turnos) marca la decisión como automática.
- Nueva sección "Auto-aprobadas hoy" en `/admin/solicitudes` permite revisión retroactiva y revocación.
- Las decisiones manuales (admin/gerente clica) tienen `decisionAutomatica=false` y `decididaPorUserId` poblado.

### 2. Días que requieren validación manual — **Opción C: array configurable por edición**

- Nuevo campo `Edicion.diasCriticos: DateTime[] @db.Date[]` (Postgres `date[]`).
- Editable desde `/admin/ediciones` con `<Calendar mode="multiple">` de shadcn/ui.
- Admin marca: día grande (15-mayo San Isidro), festivos, vísperas de festivo, fines de semana fuertes, etc.
- **Regla de evaluación**: un turno cae en día crítico si **cualquier parte** de su intervalo (`fechaInicio` o `fechaFin`) coincide con una fecha del array. Cubre turnos que cruzan medianoche.
- Turnos en día crítico → siempre `pendiente`, nunca auto-aprobados, independientemente del histórico del solicitante.

### 3. Criterios de auto-aprobación — **Opción C: reglas explícitas AND** + excepción para nuevos

#### Para reincidentes (con histórico)

Auto-aprobado si **TODAS** estas condiciones se cumplen:

- ≥ 1 edición anterior con al menos 1 turno asistido.
- Asistencia histórica ≥ 75% (turnos asistidos / turnos asignados, agregado entre ediciones).
- Sin semáforo rojo en las últimas 2 ediciones.
- Sin cancelación tardía registrada en la última edición.

#### Para solicitantes nuevos (sin histórico)

Auto-aprobado **solo** si todos los turnos solicitados caen en:

- Día laborable: lunes a jueves (`DOW IN (1,2,3,4)`).
- No incluido en `Edicion.diasCriticos` (lo cual ya cubre festivos, vísperas y día grande si admin los marcó correctamente).

Si la solicitud mezcla turnos auto-aprobables y no auto-aprobables, el estado de cabecera queda como `parcial`.

### 4. Identificación de reincidentes

- **Empleados** (con DNI obligatorio): cruce directo `SolicitudEmpleado.dni ↔ Empleado.dni`. Trivial. Permite calcular asistencia histórica via `Empleado → TurnoEmpleado[]` filtrando por `Edicion != actual`.
- **Voluntarios** (sin DNI): **match estricto** — se considera misma persona si `(telefono == prev.telefono OR email == prev.email) AND entidadId == prev.entidadId`.
  - Si falta teléfono y email, o cambia de entidad, queda como nuevo (precisión > recall).
  - Implementación: query a `SolicitudVoluntario` con `estado=aprobada` filtrando por entidad y match de teléfono/email. Sin nueva tabla.
  - Para alimentar el score histórico de un voluntario reincidente, hay que enlazar las solicitudes anteriores con el `Empleado` que se creó al aprobarlas y leer su `scoreFiabilidad` y `TurnoEmpleado` históricos.
  - Índices nuevos sugeridos: `SolicitudVoluntario(entidadId, telefono)`, `SolicitudVoluntario(entidadId, email)`.

### 5. Semáforo de desempeño — 3 colores por turno + agregado por persona

#### Modelo de datos

- `TurnoEmpleado.desempeno: enum('verde','amarillo','rojo')?` (nullable, default null).
- `TurnoEmpleado.notaDesempeno: String? @db.Text` (libre, opcional).
- `TurnoEmpleado.evaluadoAt: DateTime?`.
- `TurnoEmpleado.evaluadoPorUserId: String?` (FK a `User`).
- `TurnoEmpleado.evaluadoAuto: Boolean @default(false)` (true cuando se aplicó auto-verde por timeout).
- `Empleado.scoreFiabilidad: Decimal?` (recalculado tras cada evaluación; rango aprox -1.0 a +1.0 calculado como `(verdes − rojos) / total_evaluados`).
- `Empleado.colorFiabilidad: enum('verde','amarillo','rojo')?` (derivado del score con umbrales configurables; cacheado para queries rápidas).

#### Flujo de marcado en 2 pasos

1. **Durante el turno**: gerente/cajero marca asistencia en `/turnos/asistencias` (UI actual, sin cambios sustanciales más allá de quitar la posibilidad de evaluar desempeño desde aquí).
2. **Al cierre del día**: nueva ruta `/turnos/evaluar` lista los `TurnoEmpleado` donde `asistio=true && desempeno=null && fechaFin < now()`. Para cada uno: selector 🟢/🟡/🔴 + nota opcional. Selector obligatorio para registrar la evaluación.

Permisos: gerente/admin. Cajero solo marca asistencia, no evalúa desempeño (se añadirá permiso granular `turnos.evaluar_desempeno` para afinar si hace falta).

#### Política de evaluación olvidada — auto-verde a los 7 días

- Si `fechaFin + 7 días < now()` y `desempeno IS NULL`, al entrar en `/turnos/evaluar` (o en cualquier query de score) se aplica:
  - `desempeno = 'verde'`
  - `evaluadoAuto = true`
  - `evaluadoAt = now()`
- Implementación: lazy migration vía server action al entrar en la pantalla de evaluación. **Sin cron**.
- Estos auto-verdes **sí cuentan** en el score histórico, pero su contribución es trazable (`evaluadoAuto=true` permite filtrarlos para analytics o ajuste futuro si la métrica resulta sesgada).

#### Recálculo del score

- Tras cada UPDATE de `TurnoEmpleado.desempeno` (manual o auto), recalcular `Empleado.scoreFiabilidad` y `colorFiabilidad` en la misma transacción.
- Fórmula: `score = (count(verdes) − count(rojos)) / count(no_null)`.
- Mapeo a color (umbrales editables vía constantes en `app/src/lib/`): `score ≥ 0.6 → verde`, `0.0 ≤ score < 0.6 → amarillo`, `score < 0.0 → rojo`.

#### Auditabilidad

- Las mutaciones de `desempeno` ya quedan en `AuditLog` por la extensión Prisma global (sin cambios).
- Útil cruzar `AuditLog` para reconstruir histórico de cambios de evaluación si hay disputa.

---

---

## Algoritmo final de auto-aprobación (pseudocódigo)

```
function autoAprobar(solicitud):
  edicion = solicitud.edicion
  reincidente = identificarReincidente(solicitud)  // por DNI o match estricto
  perfilHistorico = reincidente ? cargarHistorico(reincidente) : null

  cumpleHistorico =
    perfilHistorico != null AND
    perfilHistorico.edicionesPrevias >= 1 AND
    perfilHistorico.asistenciaPct >= 0.75 AND
    perfilHistorico.tieneRojoUltimasDosEdiciones == false AND
    perfilHistorico.cancelacionTardiaUltimaEdicion == false

  for turno in solicitud.turnos:
    enDiaCritico = anyOverlap(turno, edicion.diasCriticos)
    esLaborableTranquilo =
      not enDiaCritico AND
      DOW(turno.fechaInicio) IN (1,2,3,4)  // lunes a jueves

    if enDiaCritico:
      turno.estado = 'pendiente'
      continue

    if cumpleHistorico:
      turno.estado = 'aprobado'
      turno.decisionAutomatica = true
      continue

    if not reincidente AND esLaborableTranquilo:
      turno.estado = 'aprobado'
      turno.decisionAutomatica = true
      continue

    turno.estado = 'pendiente'  // requiere validación manual

  solicitud.estado = derivarEstadoCabecera(solicitud.turnos)
  // todos aprobados → 'aprobada'
  // todos pendientes → 'pendiente'
  // mezcla → 'parcial'
  solicitud.decisionAutomatica = todos_los_turnos_resueltos_automaticamente
```

Punto de inserción del algoritmo: server actions de creación de solicitud pública en
`app/src/app/(public)/apuntarse/[token]/actions.ts` y `apuntarse-empleado/[token]/actions.ts`
(o equivalentes según se confirme con el explorador).

---

## Cambios de schema previstos

```prisma
model Edicion {
  // ...
  diasCriticos DateTime[] @db.Date  // nuevo
}

model SolicitudVoluntario {
  // ...
  decisionAutomatica Boolean @default(false)  // nuevo
  motivoAutomatico   String?                  // nuevo - regla aplicada
}

model SolicitudVoluntarioTurno {
  // ...
  decisionAutomatica Boolean @default(false)  // nuevo
}

model SolicitudEmpleado {
  // ...
  decisionAutomatica Boolean @default(false)  // nuevo
  motivoAutomatico   String?                  // nuevo
}

model SolicitudEmpleadoTurno {
  // ...
  decisionAutomatica Boolean @default(false)  // nuevo
}

enum Desempeno {
  verde
  amarillo
  rojo
}

model TurnoEmpleado {
  // ...
  desempeno         Desempeno?  // nuevo
  notaDesempeno     String?     @db.Text  // nuevo
  evaluadoAt        DateTime?   // nuevo
  evaluadoPorUserId String?     // nuevo
  evaluadoAuto      Boolean     @default(false)  // nuevo
  evaluadoPor       User?       @relation("EvaluadoPor", fields:[evaluadoPorUserId], references:[id], onDelete: SetNull)
}

model Empleado {
  // ...
  scoreFiabilidad   Decimal?    @db.Decimal(4,3)  // nuevo, rango -1.0 a 1.0
  colorFiabilidad   Desempeno?                    // nuevo, derivado
}
```

Migración: una sola `migrate dev --name auto_aprobacion_y_semaforo`. Sin backfill complejo (todos los nuevos campos son nullable o tienen default).

---

## Cambios UI previstos

| Ruta | Cambio |
|---|---|
| `/admin/ediciones` | Editor de `diasCriticos` con `<Calendar mode="multiple">` |
| `/admin/solicitudes` | Filtros nuevos: "Auto-aprobadas" / "Manuales". Badge en cada fila si fue automática. Acción "revocar auto-aprobación" |
| `/turnos/asistencias` | Sin cambios sustanciales (se quita la idea de evaluar aquí) |
| `/turnos/evaluar` | **Nueva ruta**: bandeja de turnos asistidos pendientes de evaluación |
| `/empleados/[id]` | Mostrar `colorFiabilidad`, `scoreFiabilidad`, histórico de turnos con desempeño |

---

## Asunciones que el recon debe verificar

Antes de redactar el plan TDD, el recon (`dev-planner` con subagentes Explore/Analyst) debe confirmar:

1. **Conversión Solicitud → Empleado**: al aprobar una solicitud (voluntario o empleado), ¿se crea automáticamente un `Empleado` enlazado? Si no, hay que añadir ese paso para que el histórico tenga ancla.
2. **Punto de inserción del algoritmo**: ¿la creación pública de solicitud está en `(public)/apuntarse/...` server actions o en otro lugar? Confirmar nombres reales.
3. **Patrón de actualización de score**: ¿hay ya alguna columna calculada/cacheada en `Empleado` cuyo patrón pueda copiarse? Si no, decidir entre función en `lib/` invocada en cada UPDATE de `desempeno` o vista materializada.
4. **`/admin/permisos`**: confirmar nomenclatura existente para añadir `turnos.evaluar_desempeno` siguiendo convención del repo.
5. **Tests existentes**: verificar si hay tests Vitest para las server actions de solicitudes (`crearSolicitudVoluntarioAction`, etc.) — serán plantilla para los nuevos tests del algoritmo.

---

## Verificación end-to-end

Cuando el desarrollo esté completo, deberíamos poder validar:

- [ ] Crear edición con `diasCriticos = [15-mayo]`. Solicitud nueva con turnos en 14, 15 y 16-mayo: el del 15 queda pendiente, los otros se procesan según reglas.
- [ ] Solicitante voluntario con histórico aprobado en edición previa (mismo teléfono+entidad): solicitud auto-aprobada, badge visible en `/admin/solicitudes`.
- [ ] Solicitante nuevo con turno solo en martes (no crítico): auto-aprobado.
- [ ] Solicitante nuevo con turno en sábado: pendiente.
- [ ] Test E2E del flujo evaluación: marcar asistencia en `/turnos/asistencias` el día X, al día siguiente el turno aparece en `/turnos/evaluar`, marcar 🟡 + nota, recalculo de `Empleado.scoreFiabilidad` visible en `/empleados/[id]`.
- [ ] Turno asistido sin evaluar 8 días: al entrar en `/turnos/evaluar`, automáticamente queda como verde + `evaluadoAuto=true`.
- [ ] Empleado con 1 turno rojo en última edición intenta volver: solicitud queda pendiente (no auto-aprobada).
- [ ] Revocar auto-aprobación desde `/admin/solicitudes`: vuelve a `pendiente`, queda en `AuditLog`.

---

## Próximos pasos

1. Aprobar este diseño (`ExitPlanMode`).
2. Pasar a `superpowers:writing-plans` (en sesión nueva o continuación) para descomponer en tareas TDD ancladas a archivos reales — usando antes el recon `dev-planner` para verificar las 5 asunciones de arriba.
