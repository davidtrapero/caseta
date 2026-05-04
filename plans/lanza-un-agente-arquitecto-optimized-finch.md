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

## Fase 3.5 — Perfiles de empleado en turnos

### Contexto

Tras cerrar la fase 3 (vista día + semana + diálogos), el usuario pide distinguir **categorías operativas** dentro de un turno. Hoy un `Empleado` solo diferencia cobra/no-cobra (`jornalDiario?`), pero la feria necesita modelar el rol funcional: un vigilante no es lo mismo que un ayudante de barra aunque ambos sean "trabajadores". Además, al planificar un turno el usuario quiere **reservar plazas por perfil** sin tener aún a las personas asignadas ("el sábado a las 22h necesito 1 vigilante + 2 coordinadores + 4 trabajadores + 3 voluntarios, ya veré a quién pongo").

### Requisitos funcionales (del usuario)

1. Perfil del empleado elegible al alta: `trabajador`, `voluntario`, `coordinador`, `vigilante`, `ayudante`.
2. Al crear un turno, poder indicar nº de plazas esperadas por perfil (asignación diferida).
3. Cada perfil con color identificativo consistente en toda la UI.
4. Orden de agrupación al listar personas de un turno: **vigilantes → coordinadores → trabajadores → voluntarios → ayudantes**.
5. Vista semanal: cada día muestra un resumen con turnos y nº de personas por perfil.

### Cambios de schema ([app/prisma/schema.prisma](../app/prisma/schema.prisma))

```prisma
enum PerfilEmpleado {
  vigilante
  coordinador
  trabajador
  voluntario
  ayudante
}

model Empleado {
  // ... campos existentes ...
  perfil       PerfilEmpleado @default(trabajador)
}

// Nueva entidad: plazas esperadas por perfil en un turno (asignación diferida)
model TurnoPlaza {
  id        String         @id @default(cuid())
  turnoId   String
  perfil    PerfilEmpleado
  cantidad  Int
  turno     Turno @relation(fields: [turnoId], references: [id], onDelete: Cascade)
  @@unique([turnoId, perfil])
}

model Turno {
  // ... relaciones existentes ...
  plazas    TurnoPlaza[]
}
```

**Regla de acoplamiento voluntario ⇔ jornalDiario** (decidido con el usuario): `perfil=voluntario` ⇔ `jornalDiario IS NULL`. Se valida en dos sitios:
- **Zod** en formulario Empleado: `.refine(d => (d.perfil === 'voluntario') === (d.jornalDiario == null), 'Voluntario y jornal son excluyentes')`.
- **SQL check constraint** añadida en la migración como SQL raw (Prisma no soporta CHECK nativo): `ALTER TABLE "Empleado" ADD CONSTRAINT voluntario_sin_jornal CHECK ((perfil = 'voluntario') = (jornalDiario IS NULL));`.

**Migración**: `npx prisma migrate dev --name perfiles_empleado`. Pasos dentro de la misma migración:
1. Añadir enum y columna `perfil` con default `trabajador`.
2. Backfill: `UPDATE "Empleado" SET perfil='voluntario' WHERE "jornalDiario" IS NULL;`
3. Añadir CHECK constraint (después del backfill para que no falle).
4. Crear tabla `TurnoPlaza`.

### Cambios de Server Actions ([app/src/app/(app)/turnos/actions.ts](../app/src/app/(app)/turnos/actions.ts))

- **`crearTurnoAction`**: extender `crearTurnoSchema` con campo opcional `plazasJson: { perfil, cantidad }[]`. Tras crear el `Turno`, crear `TurnoPlaza` en batch dentro de la misma transacción + `withAuditContext`.
- **`actualizarTurnoAction`**: nueva sub-acción `actualizarPlazasAction(turnoId, plazas[])` — upsert por `(turnoId, perfil)`, borra perfiles con cantidad 0.
- **`asignarEmpleadoAction`**: sin cambio de contrato, pero cuando se asigna un empleado descontar visualmente del contador de plazas (lógica en UI, no en DB: comparar `plazas` vs `asignaciones` agrupadas por perfil).

CRUD Empleado ([app/src/app/(app)/empleados/actions.ts](../app/src/app/(app)/empleados/actions.ts)): extender schemas Zod con `perfil: z.nativeEnum(PerfilEmpleado)`.

### Cambios de UI

**Paleta de perfiles** — añadir en [app/src/app/globals.css](../app/src/app/globals.css) variables CSS y en `_lib/colores.ts` un mapa estático que **sustituye** el hash por empleadoId:

```ts
export const PERFIL_COLORES: Record<PerfilEmpleado, { bg, border, text, label }> = {
  vigilante:   { /* granate #5c1a17 — autoridad */ },
  coordinador: { /* latón oscuro #8a5a1f — mando */ },
  trabajador:  { /* albero #c68a3a — base */ },
  voluntario:  { /* oliva #6b7a3a — apoyo */ },
  ayudante:    { /* arena #d4b88a — complemento */ },
};
```

Mantener la paleta cálida del proyecto (no azules/violetas). El hash dinámico por empleadoId queda deprecado.

**Componentes a tocar**:

| Componente | Cambio |
|---|---|
| [`ChipEmpleado.tsx`](../app/src/app/(app)/turnos/_components/ChipEmpleado.tsx) | Color según `empleado.perfil` (no hash de id). Mantener ❤️ si voluntario. |
| [`BloqueTurno.tsx`](../app/src/app/(app)/turnos/_components/BloqueTurno.tsx) | Ordenar `asignaciones` por `PERFIL_ORDEN = [vigilante, coordinador, trabajador, voluntario, ayudante]` antes de renderizar. Mostrar chips agrupados con mini-separador por perfil. |
| [`DialogoNuevoTurno.tsx`](../app/src/app/(app)/turnos/_components/DialogoNuevoTurno.tsx) | Nueva sección "Plazas esperadas": 5 inputs numéricos (uno por perfil) con su color. Enviar como JSON en `plazasJson`. |
| [`AsignarEmpleado.tsx`](../app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx) | Agrupar lista desplegable por perfil. Mostrar "faltan X" por cada perfil con plazas pendientes. |
| [Empleados] formulario alta/edición | `Select` con los 5 perfiles. |
| `semana/page.tsx` (ResumenDiaSemana) | Para cada día: además de `numTurnos` y `numPersonas`, mostrar desglose `1V · 2C · 4T · 3Vol · 1A` con los colores del perfil. Considerar también "plazas sin cubrir" (rojo) si `sum(plazas) > sum(asignaciones)`. |

**Constante compartida** nueva en `_lib/perfiles.ts`:
```ts
export const PERFIL_ORDEN: PerfilEmpleado[] = ['vigilante','coordinador','trabajador','voluntario','ayudante'];
export const PERFIL_LABEL: Record<PerfilEmpleado, string> = { ... };
```

### Ficheros críticos a modificar

- [app/prisma/schema.prisma](../app/prisma/schema.prisma) — enum + campo + entidad `TurnoPlaza`.
- [app/src/app/(app)/turnos/actions.ts](../app/src/app/(app)/turnos/actions.ts) — Zod + crear plazas + nueva acción.
- [app/src/app/(app)/turnos/_lib/colores.ts](../app/src/app/(app)/turnos/_lib/colores.ts) — deprecar hash, exportar `PERFIL_COLORES`.
- [app/src/app/(app)/turnos/_lib/perfiles.ts](../app/src/app/(app)/turnos/_lib/perfiles.ts) — **nuevo**: orden + labels + helpers.
- [app/src/app/(app)/turnos/_components/](../app/src/app/(app)/turnos/_components/) — `ChipEmpleado`, `BloqueTurno`, `DialogoNuevoTurno`, `AsignarEmpleado`.
- [app/src/app/(app)/turnos/semana/page.tsx](../app/src/app/(app)/turnos/semana/page.tsx) — resumen diario por perfil.
- [app/src/app/(app)/empleados/](../app/src/app/(app)/empleados/) — formulario + listado.
- [app/prisma/seed.ts](../app/prisma/seed.ts) — actualizar seed para poblar perfiles variados.

### Reutilización

- `withAuditContext` + `requireRole` ya existen — seguir patrón.
- `detectarSolape` en [app/src/lib/turnos-solape.ts](../app/src/lib/turnos-solape.ts) no cambia: la validación de solape es por persona, no por perfil.
- `ChipEmpleado` y el tipo `EmpleadoMin` ya centralizados — solo añadir campo `perfil`.

### Verificación end-to-end

1. `npx prisma migrate dev --name perfiles_empleado` aplica sin errores y backfill deja voluntarios con `perfil=voluntario`.
2. `npm run build` pasa sin warnings nuevos.
3. Smoke test manual:
   - Crear 5 empleados, uno de cada perfil.
   - Crear un turno indicando `{vigilante:1, coordinador:2, trabajador:3, voluntario:1, ayudante:1}`. Comprobar que el diálogo guarda las plazas y `AuditLog` registra create sobre `TurnoPlaza`.
   - Asignar sólo 2 personas al turno. Verificar en vista día que los chips se ordenan `vigilante → coordinador → trabajador → voluntario → ayudante` con sus colores.
   - Vista semana: el día del turno muestra resumen con conteos por perfil y un indicador de plazas sin cubrir.
4. Regresión: turnos creados en fase 3 sin plazas siguen funcionando (plazas vacías ⇒ panel sin requisitos).
5. Nóminas: el cálculo sigue apoyándose en `jornalDiario`, no en `perfil` — verificar que un `voluntario` con `jornalDiario=null` sigue excluido del total.

## Siguientes pasos inmediatos

1. ✅ Descubrimiento cerrado.
2. ✅ CLAUDE.md actualizado con versiones reales.
3. ✅ Fase 0 completada y pusheada a GitHub (commit `315d219`).
4. ⏳ Lanzar Fase 1 (módulo Administración) con agente de desarrollo + testeador al cerrar.
5. Repetir para fases 2, 3, 4.
6. Lanzar Fase 5 con los 3 testeadores en paralelo.

---

## Handoff para la siguiente sesión

Este bloque resume el **estado actual** para que una futura instancia de Claude pueda continuar sin leer el historial.

### Estado del repo (commit `315d219`, branch `main`, pusheado)

- [app/](../app/) contiene el proyecto Next.js 16 + Prisma 7 + Better Auth + shadcn/ui.
- Schema completo en [app/prisma/schema.prisma](../app/prisma/schema.prisma) con las 15 entidades del modelo consolidado.
- Migración inicial aplicada al branch `dev` de Neon.
- Auth funcionando con rutas protegidas vía [app/src/proxy.ts](../app/src/proxy.ts) y `requireRole()` en [app/src/lib/authz.ts](../app/src/lib/authz.ts).
- `AuditLog` automático via extensión Prisma en [app/src/lib/audit.ts](../app/src/lib/audit.ts) — escribe a `AuditLog` cada create/update/delete de entidades de dominio. El `usuarioId` se lee de `AsyncLocalStorage` seteado con `withAuditContext(userId, fn)` al inicio de cada Server Action.
- Sidebar con 5 módulos (Casetas, Empleados, Turnos, Inventario, Caja). Sólo Inicio tiene contenido real; el resto son placeholders.
- Admin creado: `admin@caseta.local` / `admin1234!` (cambiar en primer login).

### Gotchas del entorno

- **Proxy TLS corporativo (Zscaler + Sanitas)**: cualquier comando que haga fetch externo (prisma, shadcn CLI, algunos installs) requiere `NODE_EXTRA_CA_CERTS='C:\Users\dtrapero\all_certs_full.pem'` prepended. El bundle incluye `all_certs.pem` del usuario + Zscaler Root exportado manualmente del Windows Store.
- **Shadcn CLI bloqueado por TLS**: los componentes se instalan copiando el código canónico manualmente a [app/src/components/ui/](../app/src/components/ui/). No usar `npx shadcn add <component>`.
- **Prisma 7 breaking changes respecto al plan original**:
  - `url` ya no va en `datasource`; vive en [app/prisma.config.ts](../app/prisma.config.ts).
  - Cliente se genera en `node_modules/@prisma/client` pero con ruta re-exportada — importa `import { PrismaClient } from "@prisma/client"` y funciona.
  - Runtime usa `PrismaPg` de `@prisma/adapter-pg` (JS puro, sin engine nativo). CLI (`migrate`/`generate`) sí requiere el engine (de ahí el TLS).
- **Next 16 cambios**:
  - `src/middleware.ts` → `src/proxy.ts` (export `proxy` no `middleware`).
  - `useSearchParams` en client components requiere `<Suspense>` al prerender (ver [app/src/app/login/page.tsx](../app/src/app/login/page.tsx)).

### Decisiones cerradas (NO re-litigar)

Ver tabla completa en la sección "Decisiones ya cerradas" al inicio del documento. Resumen de las más impactantes:
- Multi-caseta con `Edicion` como raíz temporal (feria anual + históricos).
- Sin obligaciones fiscales — solo control interno de caja.
- Back-office puro, no TPV, no offline, no fichaje en vivo.
- Jornal diario fijo; voluntarios (`jornalDiario=null`) no cobran.
- Solo monto total diario en cierre de caja, sin detalle por producto.
- No se registran mermas.
- 3 roles: `admin`, `gerente`, `cajero`. Empleados sin login.
- Auditoría en todas las entidades de dominio.

### Siguiente tarea: Fase 1 — Módulo Administración

CRUD de las entidades transversales:
- **Edicion**: año, nombre, fechas, activa. Solo admin puede crearlas/editarlas.
- **Caseta**: nombre, ubicación. admin+gerente pueden CRUD.
- **Empleado**: nombre, DNI, teléfono, jornalDiario (null=voluntario), activo. admin+gerente.
- **Proveedor**: nombre, contacto, email, teléfono. admin+gerente.
- **Usuario**: email, nombre, rol, activo. **Solo admin**. Creación via `auth.api.signUpEmail()` + update del rol (ver patrón en [app/prisma/seed.ts](../app/prisma/seed.ts)).

Criterios de aceptación:
- Cada entidad tiene listado, formulario de creación, edición y desactivación (soft-delete via `activo=false`, no DELETE físico salvo en Usuario sin sesiones).
- Validación con Zod en Server Actions.
- Patrón obligatorio: `requireRole([...])` → validar Zod → op Prisma dentro de `withAuditContext(userId, ...)` → `revalidatePath()` → retorno tipado.
- UI con shadcn components ya instalados (Button, Input, Label, Card). Si necesitas Dialog, Select, Table, etc., crearlos manualmente en `src/components/ui/` copiando del repo oficial shadcn (no usar CLI).
- Empleado.jornalDiario: input numérico con nota "dejar vacío si es voluntario".

Tareas previas al commit de Fase 1:
- `npm run build` debe pasar sin errores ni warnings (aparte de los de `ignore pg deprecations` ya conocidos).
- Smoke test: crear 1 Edición, 2 Casetas, 3 Empleados (1 voluntario), 1 Proveedor desde la UI. Verificar entradas en `AuditLog`.

## Ficheros afectados

- [arquitectura-feria.md](../arquitectura-feria.md) — recibirá las secciones nuevas (modelo de datos ampliado, módulos y sub-funcionalidades, roles, login).
- [CLAUDE.md](../CLAUDE.md) — actualizar lista de entidades previstas y decisiones cerradas.
- Ningún fichero de código: el repositorio sigue pre-bootstrap hasta cerrar el análisis.

## Verificación

Al ser análisis previo a código:
- Tras responder los bloques A-D, el documento debe permitir a un desarrollador (o a Claude) generar el `schema.prisma` sin preguntas adicionales.
- Los 3 roles propuestos deben mapear sin ambigüedad a las acciones de cada módulo.
- No deben quedar referencias a conceptos descartados (tickets fiscales, PWA, fichaje en vivo).
