# Plan: Análisis completo previo a codificación

## Contexto

Proyecto de app web privada de **back-office** para gestión de casetas de feria. Repositorio pre-bootstrap: solo existe [arquitectura-feria.md](../arquitectura-feria.md). Stack ya decidido: Next.js 14 App Router + Prisma + PostgreSQL + Tailwind + TypeScript, desplegado en Railway.

El usuario quiere un **análisis lo más completo posible antes de codificar**, trabajado iterativamente con un analista funcional y un arquitecto técnico coordinados. Este plan recoge el estado actual del descubrimiento y las preguntas abiertas que lo bloquean.

## Decisiones ya cerradas

| Decisión | Valor |
|---|---|
| Multi-caseta / mono-caseta | **Multi-caseta** |
| Alcance fiscal | **Sin obligación fiscal** (solo control interno: caja diaria, gastos, sueldos) |
| Offline / tiempo real | **Back-office**. No TPV, no fichaje en vivo, no PWA. Se usa desde casa con conexión estable. |
| Periodicidad | **Una feria anual recurrente con años históricos**. Entidad `Edicion` como raíz temporal. |
| Catálogo de productos | **Por caseta**. `Producto` lleva `casetaId`. |
| Empleado ↔ caseta | **Mixto**. La caseta de trabajo se define en `Turno`, no en `Empleado`. |
| Tipos de empleado | **Dos tipos: normal (cobra) y voluntario (no cobra)**. Modelado como `Empleado.jornalDiario Decimal?` — `null` ⇒ voluntario. |
| Remuneración | **Jornal diario fijo**. `Turno` no necesita horas precisas, solo fecha + asistencia. |
| Granularidad del cierre de caja | **Diario por caseta**. UNIQUE `(casetaId, edicionId, fecha)` en `CierreDiario`. |
| Registro de ventas | **Solo monto total diario**. Sin detalle producto↔venta. Inventario se ajusta manualmente. |
| Gastos centralizados | **Sí existen**. `Gasto.casetaId` es **nullable**; null ⇒ gasto transversal de la edición. |
| Acceso a la app | **Varios usuarios con roles diferenciados**: `admin`, `gerente`, `cajero`. RBAC completo. |
| Mermas / salidas no-venta | **No se registran**. `MovimientoStock` solo tiene entradas (pedidos) + ajustes manuales (inventario físico). |
| Auditoría | **Changelog en todas las entidades**. Implementar con tabla única `AuditLog`. |
| BD en producción | **Por decidir al desplegar**. Desarrollo con Postgres local (Docker). |
| Idiomas | **Solo español**. Sin i18n. |

---

## Módulos y sub-funcionalidades (analista)

### Turnos (planificación + cálculo de horas)
- CRUD de turno (fecha, horas, caseta, empleado).
- Calendario semanal/mensual por caseta.
- Cálculo de horas trabajadas por empleado en un rango.
- Marcado retrospectivo de asistencia/ausencia.
- Export base para nómina (horas × tarifa).

### Inventario (stock + pedidos, nivel gestión)
- CRUD producto.
- Consulta y ajuste de stock por caseta.
- Movimientos (entrada/salida) con causa (compra, consumo, merma).
- Creación y recepción de pedidos a proveedores.
- Historial de movimientos (auditoría).

### Caja y contabilidad interna
- Cierre diario agregado por caseta (ingresos totales del día).
- Registro de gastos categorizados (transporte, material, compras, etc.).
- Nóminas calculadas a partir de turnos trabajados.
- Balance por feria/evento y por caseta.

### Administración (transversal)
- CRUD caseta, empleado, proveedor, usuario.
- Configuración del periodo de feria (si se adopta entidad `Evento`).

---

## Modelo de datos preliminar (arquitecto)

Entidades propuestas con relaciones clave:

| Entidad | Propósito | Notas |
|---|---|---|
| `Usuario` | Cuenta de login | **Separada de `Empleado`**: permite auditoría sin exponer credenciales. Pocos usuarios (2-5). |
| `Rol` / enum | Autorización | Valores iniciales sugeridos: `admin`, `gerente`, `cajero`. |
| `Caseta` | Punto de venta | Raíz multi-tenant: casi todas las entidades operativas llevan `casetaId`. |
| `Empleado` | Recurso laboral (sin login obligatorio) | Transversal entre ediciones. Campo `jornalDiario: Decimal?` (null ⇒ voluntario, no cobra). La caseta se define en cada `Turno`, no aquí. |
| `Turno` | Día de trabajo asignado | FK `empleadoId`, `casetaId`, `edicionId`. Campos: `fecha`, `asistio` (bool). **Sin horas** (jornal diario). Índices por `(caseta, fecha)` y `(empleado, fecha)`. |
| `Producto` | SKU de inventario | **Catálogo por caseta**: `casetaId` obligatorio. |
| `Edicion` | Año/edición de la feria | Raíz histórica. FK en `Turno`, `CierreDiario`, `Gasto`, `Pedido`, `MovimientoStock`. `Caseta`, `Empleado`, `Proveedor` son transversales entre ediciones. |
| `Stock` | Cantidad actual por caseta | Desnormalizado para lecturas rápidas. |
| `MovimientoStock` | Historial de entradas y ajustes | Solo **entradas** (recepción de pedidos) y **ajustes manuales** (inventario físico). No se registran mermas. |
| `AuditLog` | Changelog transversal | Campos: `entidad`, `entidadId`, `accion` (create/update/delete), `usuarioId`, `cambios` (JSON), `fecha`. Alimentado por Prisma middleware. |
| `Proveedor` | Terceros | 1:N con `Pedido`. |
| `Pedido` + `DetallePedido` | Orden de compra | `DetallePedido.precioUnitario` historiza coste en el tiempo. |
| `CierreDiario` | Cierre de caja diario | Entidad persistente (no vista calculada) + UNIQUE `(casetaId, fecha)`. |
| `Gasto` | Gasto operativo | Categorizable; FK `casetaId` o nullable si el gasto es centralizado. |
| `Nomina` / `Pago` | Nómina por empleado y edición | Calculada: `COUNT(Turno.asistio=true) × Empleado.jornalDiario`. Voluntarios quedan excluidos (jornalDiario null). |

### Decisiones técnicas ya tomadas en el análisis
- `Usuario` y `Empleado` son **entidades distintas**.
- `Stock` desnormalizado + `MovimientoStock` como log.
- `CierreDiario` persistente, con bloqueo post-cierre para evitar edición retroactiva.

---

## Login y perfilado (arquitecto)

**Recomendación: Lucia Auth + sesiones en BD**

- NextAuth v5 se descarta por sobreingeniería para un login cerrado de 2-5 cuentas.
- Cookies caseras con `jose` se descartan por reinventar mal lo que Lucia ya hace bien.
- Cookies httpOnly + secure, TTL 24h, sesión persistida en PostgreSQL.
- Alta de usuarios manual por admin (no auto-registro).
- Autorización: función `requireRole()` invocada al inicio de cada Server Action.

**Patrón de Server Actions acordado**: `"use server"` → `requireRole()` → validación Zod → operación Prisma → `revalidatePath()` / `revalidateTag()` → retorno tipado `{ ok: true, data } | { ok: false, error }`.

---

## Roles propuestos (pendiente de consolidar)

El analista propone 5 roles; el arquitecto propone 3. Para 2-5 usuarios totales, **5 roles es sobreingeniería**. Propuesta de síntesis:

| Rol | Alcance |
|---|---|
| `admin` | Todo. Crea usuarios, edita datos sensibles (nóminas, cierres pasados). |
| `gerente` | Operativa diaria completa. No toca nóminas ni usuarios. |
| `cajero` | Introduce cierres y gastos del día. Solo lectura del resto. |

Empleados **no** tienen login en el MVP: son datos del sistema. (Confirmar con usuario.)

---

## Preguntas pendientes para el usuario

Agrupadas por impacto, con opciones cerradas cuando procede. La respuesta a cada bloque desbloquea decisiones concretas del schema.

### Bloque A — Estructura temporal y multi-caseta ✅ RESUELTO
Ver tabla de "Decisiones ya cerradas".

### Bloque B — Modelo de pago y granularidad de caja ✅ RESUELTO

### Bloque C — Operativa y roles ✅ RESUELTO
Pendiente confirmar: ¿empleados con login? (asumido que **no** en MVP — son solo datos).

### Bloque D — Infraestructura ✅ PARCIAL
- BD en producción: por decidir al desplegar (desarrollo con Docker local).
- Backups: pendiente, condicionado a la elección final de proveedor.
- Idioma: solo español.

---

## Schema conceptual final (listo para Prisma)

```
Usuario        (id, email, passwordHash, nombre, rol[admin|gerente|cajero], activo)
Sesion         (id, usuarioId, expiresAt)

Edicion        (id, anio UNIQUE, nombre, fechaInicio, fechaFin, activa)

Caseta         (id, nombre, ubicacion, activa)
Empleado       (id, nombre, dni?, telefono?, jornalDiario Decimal?, activo)
                  -- jornalDiario NULL ⇒ voluntario (no cobra)

Turno          (id, edicionId, casetaId, empleadoId, fecha, asistio)
                  INDEX (casetaId, fecha), (empleadoId, fecha)
                  UNIQUE (empleadoId, fecha)   -- no doble turno mismo día

Producto       (id, casetaId, nombre, unidad, activo)
                  -- catálogo por caseta

Stock          (id, casetaId, productoId, cantidad)
                  UNIQUE (casetaId, productoId)
MovimientoStock(id, edicionId, casetaId, productoId, tipo[entrada|ajuste], cantidad, fecha, usuarioId, nota?)

Proveedor      (id, nombre, contacto?, email?, activo)
Pedido         (id, edicionId, proveedorId, casetaId, fechaPedido, fechaRecepcion?, estado[pendiente|recibido|cancelado], total)
DetallePedido  (id, pedidoId, productoId, cantidad, precioUnitario)

CierreDiario   (id, edicionId, casetaId, fecha, ingresosTotales, notas?, bloqueado)
                  UNIQUE (casetaId, edicionId, fecha)

Gasto          (id, edicionId, casetaId?, descripcion, monto, categoria, fecha, usuarioId)
                  -- casetaId NULL ⇒ gasto centralizado

Nomina         (id, edicionId, empleadoId, diasTrabajados, jornalAplicado, total, pagada)
                  UNIQUE (empleadoId, edicionId)

AuditLog       (id, entidad, entidadId, accion, usuarioId, cambios JSON, fecha)
```

## Estrategia de ejecución (agentes híbridos, turnos serializados)

### Decisiones de proceso
- **División de agentes**: híbrida. Primero un agente base monta infraestructura, después agentes por módulo con testeador propio al cerrar cada módulo.
- **Aislamiento**: mismo working tree, turnos serializados — los agentes se ejecutan secuencialmente salvo los 3 testeadores finales que sí van en paralelo.
- **Orden de módulos**: Administración → Turnos → Inventario → Caja.
- **Control del usuario**: aprobación solo en cambios de schema y decisiones de UX/analista. El resto fluye.
- **UI**: shadcn/ui + Tailwind.
- **Login de empleados**: no en MVP. Solo `admin`, `gerente`, `cajero` tienen cuenta.

### Fases

**Fase 0 — Bootstrap base (serial, sin agentes).** Lo hago yo directamente:
- `create-next-app` + TypeScript + Tailwind + App Router.
- `docker-compose.yml` con Postgres local.
- `prisma init` + volcado del schema conceptual completo a `schema.prisma`.
- Instalación de Lucia, Zod, shadcn/ui.
- Setup de login + middleware de autorización + `requireRole()` + `AuditLog` middleware de Prisma.
- Layout base (sidebar + header) con shadcn/ui.

**Fase 1 — Módulo Administración** (agente desarrollador único, porque es CRUD puro y transversal):
- CRUD: `Edicion`, `Caseta`, `Empleado`, `Proveedor`, `Usuario`.
- Formularios con shadcn + Server Actions con Zod.
- Testeador audita al cerrar → reporta bugs → developer corrige.

**Fase 2 — Módulo Turnos**:
- Calendario mensual por caseta.
- Asignación de empleado a día + caseta. UNIQUE `(empleadoId, fecha)`.
- Vista de horas trabajadas por empleado en la edición.
- Testeador audita al cerrar.

**Fase 3 — Módulo Inventario**:
- Catálogo de productos por caseta.
- Stock actual + ajustes manuales.
- Pedidos a proveedor (crear, marcar recibido, actualiza stock).
- Testeador audita al cerrar.

**Fase 4 — Módulo Caja**:
- Cierre diario por caseta (ingreso total).
- Gastos (por caseta o centralizados con `casetaId=null`).
- Nóminas (cálculo `días × jornal`, voluntarios excluidos).
- Balance por edición y por caseta.
- Testeador audita al cerrar.

**Fase 5 — Testing E2E paralelo** (aquí sí hay paralelismo real, 3 testeadores a la vez):
- Testeador front: Playwright sobre flujos UI críticos.
- Testeador back: Vitest sobre Server Actions (autorización, validación, cálculos de nómina y balance).
- Testeador E2E: recorridos completos (crear edición → casetas → empleados → turnos → cierre diario → nómina).

### Criterios por agente
- **Desarrolladores**: foco en módulo propio, no tocan otros. Ante decisión ambigua → me consultan a mí → yo te pregunto.
- **Testeadores de módulo**: reportan bugs como lista priorizada; no corrigen, solo detectan.
- **Testeadores E2E**: autorizados a crear fixtures de datos; prohibido modificar lógica de negocio.

## Siguientes pasos inmediatos

1. ✅ Descubrimiento cerrado.
2. Trasladar resumen ejecutivo a [arquitectura-feria.md](../arquitectura-feria.md) y [CLAUDE.md](../CLAUDE.md).
3. Ejecutar Fase 0 (bootstrap, por mí).
4. Lanzar Fase 1 con agente de desarrollo + testeador al cerrar.
5. Repetir para fases 2, 3, 4.
6. Lanzar Fase 5 con los 3 testeadores en paralelo.

## Ficheros afectados

- [arquitectura-feria.md](../arquitectura-feria.md) — recibirá las secciones nuevas (modelo de datos ampliado, módulos y sub-funcionalidades, roles, login).
- [CLAUDE.md](../CLAUDE.md) — actualizar lista de entidades previstas y decisiones cerradas.
- Ningún fichero de código: el repositorio sigue pre-bootstrap hasta cerrar el análisis.

## Verificación

Al ser análisis previo a código:
- Tras responder los bloques A-D, el documento debe permitir a un desarrollador (o a Claude) generar el `schema.prisma` sin preguntas adicionales.
- Los 3 roles propuestos deben mapear sin ambigüedad a las acciones de cada módulo.
- No deben quedar referencias a conceptos descartados (tickets fiscales, PWA, fichaje en vivo).
