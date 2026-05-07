# Dashboard — Propuestas de analista y UX

## Context

La página de inicio actual (`app/src/app/(app)/page.tsx`) es un placeholder con dos tarjetas estáticas
sobre el estado del bootstrap. Todos los módulos están implementados y tienen datos reales:
turnos, cierres, gastos, nóminas, stock, pedidos, voluntarios. El objetivo es convertir esa página
en un dashboard operativo que responda a la pregunta diaria: **"¿qué necesito saber ahora?"**

---

## Perspectiva analista — Qué información importa

El usuario gestiona una caseta de feria durante un período acotado (días de feria). Las decisiones
diarias giran en torno a tres preguntas:

### 1. Operaciones del día — "¿Está cubierto el turno de hoy?"
- Turnos activos en este momento y próximos (siguientes 3 horas)
- Empleados asignados al turno actual vs. asistencia confirmada
- Plazas descubiertas por perfil (vigilante/coordinador/trabajador)
- **Fuente:** `loadDiaTurnos()` en `turnos/_lib/loader.ts` — ya existe, reutilizable directamente

### 2. Caja — "¿Cómo va el dinero hoy y en la edición?"
- Ingresos del día (último `CierreDiario` de cada caseta)
- Ingresos acumulados de la edición (SUM)
- Gastos del día + gastos acumulados
- Resultado neto hasta hoy (ingresos − gastos − nóminas)
- Nóminas pendientes de pago (count + importe)
- **Fuente:** queries de aggregate ya escritas en `caja/balance/page.tsx` — copiar y adaptar

### 3. Alertas — "¿Qué está esperando mi atención?"
- Solicitudes de voluntarios en estado `pendiente` (count)
- Días pasados de la edición sin cierre registrado (gaps en CierreDiario)
- Pedidos de inventario en estado `pendiente` sin fecha de recepción
- Cierres bloqueables: días con cierre desbloqueado de hace >1 día
- **Fuente:** queries simples de count/findFirst sobre entidades existentes

### 4. Inventario — "¿Hay algo crítico en stock?"
El schema no define `stockMinimo`, así que no hay umbral automático.
La opción realista es mostrar los **últimos movimientos de stock** (últimas 24h) como
referencia operativa, y los pedidos pendientes de recibir.
- **Fuente:** `MovimientoStock` con `createdAt > ayer` + `Pedido.estado = pendiente`

### 5. Actividad reciente — "¿Qué cambió?"
- Feed de las últimas 10 entradas de `AuditLog` (solo admin/gerente)
- Filtrado por acciones relevantes: create/update/delete en entidades de dominio
- **Fuente:** `AuditLog` — existe con índice por fecha

---

## Perspectiva UX — Cómo organizar y presentar

### Principios para este contexto
- **Back-office de uso diario**: densidad de información > espectáculo visual
- **2–5 usuarios**: no hay necesidad de filtros complejos ni paginación
- **Período acotado de feria**: el contexto es siempre "edición activa, día de hoy"
- **Roles distintos**: cajero ve mucho menos que admin/gerente

### Layout propuesto

```
┌─────────────────────────────────────────────────────────┐
│  ENCABEZADO: "Feria Sevilla 2025 · Martes 6 de mayo"    │
│  [fecha actual + nombre edición activa]                  │
└─────────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│ Ingresos │  Gastos  │  Neto    │ Pendien. │  ← KPI row (4 tarjetas)
│  hoy     │ semana   │ edición  │ alertas  │
└──────────┴──────────┴──────────┴──────────┘

┌────────────────────────┬────────────────────────┐
│  TURNOS DE HOY         │  ALERTAS               │
│  [tabla compacta]      │  [lista priorizada]    │
│  turno / caseta /      │  • 3 solicitudes pend. │
│  asignados / estado    │  • 2 días sin cierre   │
│                        │  • 1 pedido atrasado   │
└────────────────────────┴────────────────────────┘

┌──────────────────────────────────────────────────┐
│  ACTIVIDAD RECIENTE  (solo admin/gerente)         │
│  [feed compacto de AuditLog, últimas 8 entradas] │
└──────────────────────────────────────────────────┘
```

### Vistas por rol

| Sección | admin | gerente | cajero |
|---------|-------|---------|--------|
| KPI row (ingresos/gastos/neto) | ✅ | ✅ | Solo ingresos del día |
| KPI alertas | ✅ | ✅ | ❌ |
| Turnos de hoy | ✅ | ✅ | ❌ |
| Alertas | ✅ | ✅ | Solo "cierres pendientes" |
| Actividad reciente | ✅ | ✅ | ❌ |

### Decisiones de diseño UX

1. **Sin gráficos de barras/líneas** en v1 — la densidad de datos es baja (días de feria son pocos)
   y añaden complejidad de implementación sin valor claro. Revisable en v2.

2. **KPI cards con delta** — mostrar variación respecto al día anterior donde aplique
   (ej. "+320€ vs. ayer")

3. **Alertas como lista accionable** — cada alerta lleva un enlace directo a la sección
   donde resolverla (no solo informativa)

4. **Turnos de hoy en tabla compacta** — turno, caseta, horario, asignados/plazas, estado
   (cubierto/descubierto). Click lleva a `/turnos`

5. **Sin selector de fecha/caseta** en el dashboard — el dashboard siempre es "hoy + edición activa".
   Los filtros viven en las páginas de módulo.

---

## Archivos a crear/modificar

| Archivo | Cambio |
|---------|--------|
| `app/src/app/(app)/page.tsx` | Reemplazar placeholder con dashboard real |
| `app/src/app/(app)/_lib/dashboard.ts` *(nuevo)* | Queries del dashboard (loader server-only) |
| `app/src/app/(app)/_components/kpi-card.tsx` *(nuevo)* | Tarjeta KPI reutilizable |
| `app/src/app/(app)/_components/alerta-item.tsx` *(nuevo)* | Item de alerta con enlace |
| `app/src/app/(app)/_components/turnos-hoy.tsx` *(nuevo)* | Tabla de turnos del día |
| `app/src/app/(app)/_components/actividad-feed.tsx` *(nuevo)* | Feed de AuditLog |

### Reutilización clave
- `loadDiaTurnos()` en `turnos/_lib/loader.ts` — para la tabla de turnos de hoy
- Queries de aggregate de `caja/balance/page.tsx` — para KPIs financieros
- `obtenerEdicionActiva()` en `lib/edicion.ts` — contexto de edición
- `getSession()` en `lib/authz.ts` — para filtrado por rol

---

## Verificación

1. Arrancar `npm run dev` desde `app/`
2. Login con cada rol (admin, gerente, cajero) y verificar que cada uno ve solo lo que le corresponde
3. Con edición activa y datos: comprobar que KPIs reflejan los valores reales de la BD
4. Sin edición activa: la página debe mostrar un estado vacío claro (no errores)
5. Con 0 alertas: la sección de alertas no debe aparecer o mostrar "todo en orden"
