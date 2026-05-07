# Informe de Hallazgos de Seguridad y Concurrencia

**Auditoría de Caseta (Next.js 16 / React 19 / Prisma 7 / Better Auth)**
**Fecha:** 2026-05-05

---

## Resumen ejecutivo

La aplicación tiene una arquitectura de seguridad **sólidamente diseñada** en los puntos críticos (autenticación, autorización, validación Zod, transacciones Prisma), pero presenta **vulnerabilidades concretas de concurrencia** que podrían permitir overbooking de voluntarios y race conditions en inventario. El middleware Edge protege adecuadamente acceso autenticado, los tokens públicos se generan de forma criptográficamente segura, pero **falta validación explícita en el rechazo de solicitudes** y hay **riesgos TOCTOU en aprobación simultánea**. Los logs de auditoría son seguros (no registran passwords/tokens), pero el rate limiting en-memoria es vulnerable a reinicios.

**Recuento:** 3 CRÍTICOS · 1 ALTO · 4 MEDIOS · 2 BAJOS.

---

## Hallazgos por severidad

### 🔴 CRÍTICO

#### 1. Race condition: overbooking de voluntarios en turnos

**Archivos:** [app/src/app/apuntarse/[token]/actions.ts](../app/src/app/apuntarse/[token]/actions.ts) + [app/src/app/(app)/admin/solicitudes/actions.ts](../app/src/app/(app)/admin/solicitudes/actions.ts)

**Descripción.** La función `calcularHuecosVoluntario()` se invoca fuera de transacción en `crearSolicitudAction` (línea 104, dentro de transacción pero DESPUÉS de validar huecos). Si dos voluntarios se apuntan simultáneamente a un turno con aforo limitado (1 plaza), ambos pueden pasar la validación de huecos (línea 107) antes de que la primera transacción se confirme. La escritura de `SolicitudVoluntarioTurno` (línea 130) ocurre dentro de transacción, pero el **check de huecos ocurre antes**, permitiendo que `SolicitudVoluntarioTurno.length > TurnoPlaza.cantidad`.

**Escenario de explotación.**

```
Turno A: TurnoPlaza(voluntario) = 1 plaza
T0: Solicitud1 y Solicitud2 ambas leen huecos = [A: 1]
T1: Solicitud1 escribe SolicitudVoluntarioTurno A → huecos reales = 0
T2: Solicitud2 escribe SolicitudVoluntarioTurno A → huecos reales = -1 ❌
```

**Recomendación.** Mover `calcularHuecosVoluntario` dentro de la transacción ANTES de crear `SolicitudVoluntarioTurno`. Usar `FOR UPDATE` en la query de `TurnoPlaza` para lock explícito:

```ts
await withAuditContext("public:apuntarse", () =>
  prisma.$transaction(async (tx) => {
    const huecos = await calcularHuecosVoluntario(tx, edicion.id, { turnoIds: data.turnoIds });
    const sinHueco = data.turnoIds.filter((id) => (huecos.get(id) ?? 0) <= 0);
    if (sinHueco.length > 0) throw new Error("Sin huecos");
    return tx.solicitudVoluntario.create({ /* ... */ });
  })
);
```

---

#### 2. Race condition: aprobación simultánea de solicitud (TOCTOU)

**Archivo:** [app/src/app/(app)/admin/solicitudes/actions.ts](../app/src/app/(app)/admin/solicitudes/actions.ts)

**Descripción.** En `aprobarSolicitudAction`, se verifica `estado="pendiente"` FUERA de transacción (línea 22), luego se inicia transacción (línea 20). Si dos gerentes aprueban simultáneamente la misma solicitud, ambos pasan el check, y Prisma ejecuta dos UPDATE con `estado: "aprobada"`. Aunque el estado final es consistente, **el empleado se asigna a turnos DOS VECES**:

- Primer admin: crea `TurnoEmpleado` (línea 130).
- Segundo admin: crea `TurnoEmpleado` nuevamente → ERROR unique constraint, pero la primera asignación ya se confirmó.

**Escenario.**

```
Solicitud S1: estado="pendiente", turnos=[T1, T2]
T0: Admin1 check estado="pendiente" ✓
T1: Admin2 check estado="pendiente" ✓
T2: Admin1 $transaction inicia, asigna T1→E1, T2→E1
T3: Admin2 $transaction inicia, intenta asignar T1→E1 → UNIQUE CONSTRAINT
```

**Recomendación.** Validar el estado DENTRO de la transacción y cambiarlo PRIMERO para prevenir la segunda transacción:

```ts
const result = await withAuditContext(user.id, () =>
  prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitudVoluntario.findUnique({
      where: { id: data.solicitudId },
      select: { estado: true, /* ... */ },
    });
    if (solicitud?.estado !== "pendiente") {
      throw new Error("Solicitud ya resuelta");
    }
    await tx.solicitudVoluntario.update({
      where: { id: data.solicitudId },
      data: { estado: "aprobada", /* ... */ },
    });
    // Luego crear empleado y asignaciones
  })
);
```

---

#### 3. Race condition: recepción de pedido y actualización de stock (lost update)

**Archivo:** [app/src/app/(app)/inventario/pedidos/actions.ts](../app/src/app/(app)/inventario/pedidos/actions.ts)

**Descripción.** En `recibirPedidoAction`, la cantidad de stock se **lee, calcula y escribe** dentro de una transacción (línea 240 `upsert`):

```ts
const stock = await tx.stock.findUnique(...);
const nueva = (stock ? Number(stock.cantidad) : 0) + cantidad;
await tx.stock.upsert({ /* update: { cantidad: nueva } */ });
```

Si dos pedidos se reciben simultáneamente para el mismo producto, ambos leen el stock anterior, calculan `nueva` y **una actualización se sobrescribe**. Aunque está en transacción, **no hay aislamiento suficiente** porque Prisma por defecto usa READ COMMITTED (no SERIALIZABLE).

**Escenario.**

```
Stock: cantidad=10
Pedido1: +5 unidades   Pedido2: +3 unidades
T0: P1 lee stock=10, calcula nueva=15
T1: P2 lee stock=10, calcula nueva=13
T2: P1 escribe cantidad=15
T3: P2 escribe cantidad=13 (sobrescribe a 15)
Resultado: Stock=13 (debería ser 18) ❌
```

**Recomendación.** Usar operación atómica `increment` (o `isolationLevel: "Serializable"`):

```ts
for (const d of pedido.detalles) {
  await tx.stock.upsert({
    where: { casetaId_productoId: { /* ... */ } },
    create: {
      casetaId: pedido.casetaId,
      productoId: d.productoId,
      cantidad: Number(d.cantidad),
    },
    update: {
      cantidad: { increment: Number(d.cantidad) }, // Operación atómica
    },
  });
}
```

---

### 🟠 ALTO

#### 4. Falta de try-catch en Server Actions que retornan `void`

**Archivos:** [app/src/app/(app)/caja/cierres/actions.ts](../app/src/app/(app)/caja/cierres/actions.ts) + [app/src/app/(app)/caja/nominas/actions.ts](../app/src/app/(app)/caja/nominas/actions.ts)

**Descripción.** Funciones como `bloquearCierreAction`, `desbloquearCierreAction`, `eliminarCierreAction`, `marcarPagadaAction`, `desmarcarPagadaAction` retornan `void` **sin try-catch**. Si `requireRole()` lanza `AuthError`, propaga hacia Next.js y el cliente ve un error 500 sin feedback estructurado.

```ts
export async function bloquearCierreAction(formData: FormData): Promise<void> {
  const id = formData.get("_id");
  if (typeof id !== "string" || !id) return;

  const { user } = await requireRole(["admin", "gerente"]); // ❌ Sin try-catch
  // Si requireRole lanza AuthError, se propaga sin captura
}
```

**Impacto.**
- Usuario no autenticado/autorizado ve error genérico 500.
- Logs de servidor se llenan de excepciones esperadas.
- Frontend no recibe `ActionResult` estructurado.

**Recomendación.** Envolver toda acción en try-catch, incluso las que retornan void.

---

### 🟡 MEDIO

#### 5. Rechazo de solicitud sin validación de estado en transacción

**Archivo:** [app/src/app/(app)/admin/solicitudes/actions.ts](../app/src/app/(app)/admin/solicitudes/actions.ts)

**Descripción.** `rechazarSolicitudAction` verifica `estado="pendiente"` FUERA de transacción (línea 173), luego actualiza DENTRO de transacción (línea 182). A diferencia de `aprobarSolicitudAction`, aquí no hay efecto secundario (no se crean empleados), pero sigue siendo TOCTOU. Dos rechazos se loguean con `decididaAt` y `decididaPorUserId` distintos.

**Recomendación.** Usar `updateMany` con condición:

```ts
const resultado = await withAuditContext(user.id, () =>
  prisma.solicitudVoluntario.updateMany({
    where: { id: data.solicitudId, estado: "pendiente" },
    data: { estado: "rechazada", decididaAt: new Date(), decididaPorUserId: user.id },
  })
);
if (resultado.count === 0) {
  return { ok: false, error: "La solicitud ya fue resuelta o no existe." };
}
```

---

#### 6. Cálculo de stock sin aislamiento (ajuste manual)

**Archivo:** [app/src/app/(app)/inventario/stock/actions.ts](../app/src/app/(app)/inventario/stock/actions.ts)

**Descripción.** Similar al hallazgo #3. `ajustarStockAction` lee stock actual, calcula diferencia y actualiza con `upsert`. Si dos usuarios ajustan stock simultáneamente, el segundo ajuste puede sobrescribir el primero, dejando el `MovimientoStock` inconsistente con el valor real.

**Recomendación.** Si el ajuste es absoluto, registrar el `MovimientoStock` con la diferencia ANTES del update; si es incremental, usar `increment`.

---

#### 7. Validación de turno sin filtro de caseta

**Archivos:** [app/src/app/(app)/turnos/asistencias/page.tsx](../app/src/app/(app)/turnos/asistencias/page.tsx) + [app/src/app/(app)/turnos/asistencias/_lib/query.ts](../app/src/app/(app)/turnos/asistencias/_lib/query.ts)

**Descripción.** En `cargarAsistencias()` se filtra por `edicionId` y opcionalmente `casetaId`, pero **no hay validación explícita** de que el usuario tenga acceso a esa caseta. No es vulnerabilidad inmediata (todos los roles ven todas las casetas por diseño), pero es un riesgo si se introduce RBAC granular en el futuro.

---

#### 8. Rate limiting en memoria: pérdida en reinicio

**Archivo:** [app/src/lib/rate-limit.ts](../app/src/lib/rate-limit.ts)

**Descripción.** `checkRateLimit()` usa `Map<string, BucketEntry>` en memoria. En arquitectura serverless, cada cold start reinicia el mapa. Un atacante puede:

1. Realizar 10 solicitudes a `/apuntarse/[token]` (límite).
2. Esperar a que la función Lambda inactiva se destruya (~15 min).
3. Realizar 10 solicitudes más → conteo reseteado.

**Recomendación.** Migrar a Upstash Redis o rate limiting a nivel de CDN (Cloudflare).

---

### 🟢 BAJO

#### 9. Exposición de detalles de error en `toActionError()`

**Archivo:** [app/src/lib/action-result.ts](../app/src/lib/action-result.ts)

**Descripción.** Cuando ocurre una excepción sin capturar, se retorna el mensaje bruto:

```ts
const msg = err instanceof Error ? err.message : "Error inesperado";
return { ok: false, error: msg };
```

Errores Prisma con detalles internos (queries malformadas, constraints específicas) se exponen al cliente.

**Recomendación.** Sanitizar mensajes antes de devolver:

```ts
function sanitizeErrorMessage(msg: string): string {
  if (msg.includes("Unique constraint")) return "Ya existe un registro con esos datos.";
  if (msg.includes("Foreign key")) return "Referencia inválida.";
  if (msg.includes("Not found")) return "Recurso no encontrado.";
  if (process.env.NODE_ENV === "production") return "Error inesperado.";
  return msg;
}
```

---

#### 10. AsyncLocalStorage: sin cleanup explícito

**Archivo:** [app/src/lib/audit.ts](../app/src/lib/audit.ts)

**Descripción.** `withAuditContext()` usa `AsyncLocalStorage.run()`, que limpia automáticamente. En entornos con Worker Threads o pooling agresivo, podría haber leaks. Impacto extremadamente bajo en contexto actual.

**Recomendación.** Documentar la suposición o agregar try-finally explícito.

---

## Análisis por dominio

### ✅ Autenticación y autorización

- `requireRole()` se invoca en TODAS las Server Actions protegidas (15/15 auditadas).
- Better Auth: registro deshabilitado, contraseña salada, cookies seguras.
- Middleware Edge ([app/src/proxy.ts](../app/src/proxy.ts)) redirige correctamente a `/login` sin sesión.
- Roles diferenciados (admin, gerente, cajero) coherentes.
- Protección contra auto-desactivación de admin.

**Riesgo residual:** TOCTOU en aprobación/rechazo (CRÍTICO #2).

---

### ✅ Validación de entrada

- Esquemas Zod en TODAS las acciones.
- `parseForm()` valida y descarta campos con prefijo `_`.
- Validadores customizados: DNI/NIE con checksum.
- Cero uso de `$queryRawUnsafe` o `$executeRawUnsafe` (excepto `test/db-reset.ts` para datos de prueba).
- Sin `dangerouslySetInnerHTML`.

---

### ⚠️ Concurrencia

**Detectados 3 race conditions** (#1, #2, #3):
- Overbooking de voluntarios.
- TOCTOU en aprobación simultánea.
- Lost update en stock.

**Posiblemente seguros:**
- Cierres diarios: unique constraint sobre `(casetaId, edicionId, fecha)`.
- Turnos: índices sobre `casetaId + fechaInicio`, sin concurrencia identificada.

---

### ✅ Exposición de datos (multi-caseta)

- Queries filtran por `edicionId` y `casetaId` correctamente.
- Exportación de asistencias filtra por edición/caseta.
- No hay `findMany()` sin `where`.

---

### ⚠️ Tokens públicos (`/apuntarse`)

- `generarToken()` usa `randomBytes(18).toString("base64url")` ✓ (144 bits de entropía).
- Token con unique constraint en `Edicion.formularioToken` ✓.
- No enumerable.
- **Debilidad:** rate limiting en memoria (#8).

---

### ✅ Logs y auditoría

- `AuditLog` no registra `password`, `token`, ni `accessToken`.
- Extensión Prisma registra solo `cambios` genéricos.
- `usuarioId` desde `AsyncLocalStorage` (no se confunde entre requests).
- Usuario público (`"public:apuntarse"`) identificable en audits.

---

## Recomendaciones priorizadas

| Prioridad | Acción | Archivo(s) |
|-----------|--------|-----------|
| **P0** | Mover validación de huecos dentro de transacción + lock `SELECT...FOR UPDATE` | [apuntarse/[token]/actions.ts](../app/src/app/apuntarse/[token]/actions.ts), [admin/solicitudes/actions.ts](../app/src/app/(app)/admin/solicitudes/actions.ts) |
| **P0** | Validar estado DENTRO de transacción en `aprobarSolicitudAction` | [admin/solicitudes/actions.ts](../app/src/app/(app)/admin/solicitudes/actions.ts) |
| **P0** | Cambiar stock update a `increment` | [inventario/stock/actions.ts](../app/src/app/(app)/inventario/stock/actions.ts), [inventario/pedidos/actions.ts](../app/src/app/(app)/inventario/pedidos/actions.ts) |
| **P1** | Rate limiting distribuido (Redis/Upstash) | [lib/rate-limit.ts](../app/src/lib/rate-limit.ts) |
| **P1** | try-catch en acciones que retornan `void` | [caja/cierres/actions.ts](../app/src/app/(app)/caja/cierres/actions.ts), [caja/nominas/actions.ts](../app/src/app/(app)/caja/nominas/actions.ts) |
| **P2** | Sanitizar mensajes de error en `toActionError()` | [lib/action-result.ts](../app/src/lib/action-result.ts) |
| **P2** | Documentar suposición sobre AsyncLocalStorage | [lib/audit.ts](../app/src/lib/audit.ts) |

---

## Conclusión

La aplicación tiene **fundaciones sólidas** de seguridad (autenticación, autorización, validación). Las **vulnerabilidades de concurrencia críticas** en overbooking de voluntarios y race conditions en stock requieren remediación antes de uso intensivo. El diseño de transacciones es correcto en estructura, pero le faltan **locks explícitos** y **validaciones de estado dentro de transacciones**. Una vez abordados los 3 hallazgos CRÍTICOS, la app alcanza nivel de robustez adecuado para su escala (2-5 usuarios, ambiente privado, carga baja).
