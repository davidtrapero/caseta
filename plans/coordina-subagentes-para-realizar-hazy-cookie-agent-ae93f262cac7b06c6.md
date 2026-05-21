# Validación de hallazgo de seguridad — `aprobarSolicitudEmpleadoAction`

## Verdict

**VALID**

## Confidence

**8/10**

## Reasoning (cita de código)

- **La firma acepta `userId` del cliente como tercer parámetro posicional.**
  En [`actions.ts:660-664`](../app/src/app/(app)/admin/solicitudes/actions.ts) la función está declarada como:
  ```ts
  export async function aprobarSolicitudEmpleadoAction(
    _prev: ActionResult<null> | null,
    formData: FormData,
    userId: string
  ): Promise<ActionResult<null>>
  ```
  Es un export de un fichero `"use server"` ([`actions.ts:1`](../app/src/app/(app)/admin/solicitudes/actions.ts)). Next.js publica TODA función exportada de un fichero `"use server"` como endpoint de Server Action accesible desde la red. El comentario JSDoc en [`actions.ts:657-658`](../app/src/app/(app)/admin/solicitudes/actions.ts) explicita la intención: "userId se pasa desde el componente cliente para evitar re-leer la sesión dentro de la transacción". Esto es exactamente el antipatrón: el servidor no debe confiar en un identificador de identidad enviado por el cliente.

- **`requirePermiso` SÍ devuelve el `user` real de la sesión, pero la función lo descarta.**
  [`authz.ts:72-100`](../app/src/lib/authz.ts) define `requirePermiso` y devuelve `{ session, user }` — donde `user` viene de `auth.api.getSession({ headers })` ([`authz.ts:18-20`](../app/src/lib/authz.ts)), origen confiable. Sin embargo en [`actions.ts:667`](../app/src/app/(app)/admin/solicitudes/actions.ts) la llamada es `await requirePermiso("solicitudes.decidir")` SIN destructurar `user`. El resto del código usa el `userId` recibido como argumento (líneas 748, 779, 869, 879).

- **El `userId` controlado por el cliente se persiste en columnas de auditoría.**
  - [`actions.ts:748`](../app/src/app/(app)/admin/solicitudes/actions.ts): `await withAuditContext(userId, () => prisma.$transaction(...))` — y [`audit.ts:54-61`](../app/src/lib/audit.ts) lo escribe como `AuditLog.usuarioId` para CADA write durante la transacción (cada `tx.empleado.create/update`, `tx.turnoEmpleado.createMany`, `tx.solicitudEmpleado.update`, `tx.solicitudEmpleadoTurno.updateMany`). Un atacante puede atribuir todas esas escrituras al admin que elija.
  - [`actions.ts:779`](../app/src/app/(app)/admin/solicitudes/actions.ts) (rechazo): `decididaPorUserId: userId`.
  - [`actions.ts:869`](../app/src/app/(app)/admin/solicitudes/actions.ts) (aprobación): `decididaPorUserId: userId` en `solicitudEmpleado.update`.
  - [`actions.ts:879`](../app/src/app/(app)/admin/solicitudes/actions.ts): `decididaPorUserId: userId` en `solicitudEmpleadoTurno.updateMany`.

- **El patrón hermano sí es seguro.** [`actions.ts:465-643`](../app/src/app/(app)/admin/solicitudes/actions.ts) (`aprobarTurnosEmpleadoAction`) y [`actions.ts:904-955`](../app/src/app/(app)/admin/solicitudes/actions.ts) (`rechazarTurnosEmpleadoAction`) hacen `const { user } = await requirePermiso("solicitudes.decidir")` (líneas 470, 909) y usan `user.id` para `withAuditContext` y `decididaPorUserId` (líneas 545, 609, 624, 912, 940, 944). El contraste evidencia que la versión vulnerable es un olvido del refactor.

- **El cliente NO usa esta acción hoy, pero eso NO la protege.** Búsqueda exhaustiva: `aprobarSolicitudEmpleadoAction` solo aparece en `actions.ts` y en `__tests__/aprobar-solicitud-empleado.test.ts`. Los componentes UI ([`acciones-empleado.tsx:8`](../app/src/app/(app)/admin/solicitudes/_components/acciones-empleado.tsx), [`acciones.tsx:9`](../app/src/app/(app)/admin/solicitudes/_components/acciones.tsx)) consumen los hermanos seguros (`aprobarTurnosEmpleadoAction` / `rechazarTurnosEmpleadoAction`). PERO al ser un export de un fichero `"use server"`, Next.js genera un endpoint con un ID estable derivado del bundle; cualquier usuario autenticado con `solicitudes.decidir` (rol `gerente` o `admin`) puede invocarla directamente vía el protocolo `React Server Actions` y suministrar el `userId` que quiera. La superficie expuesta no depende de que haya una `<form>` que la llame.

- **No cae en las exclusiones del filtro de falsos positivos.** El #18 ("lack of audit logs is not a vulnerability") NO aplica: aquí el log existe y es load-bearing — la app guarda explícitamente `decididaPorUserId` para trazabilidad y `AuditLog.usuarioId` para forense. Lo que hay es **falsificación de identidad en escrituras autenticadas** (integrity / accountability), no falta de logs. Tampoco es DOS, secretos en disco, validación cosmética, ni log spoofing en sentido textual. Es una confusión de "trust boundary": un identificador de identidad cruzando desde el cliente al servidor sin validación contra la sesión.

## Impacto concreto

Un usuario autenticado con permiso `solicitudes.decidir` (cualquier `gerente` activo) puede:
1. Invocar el endpoint Server Action de `aprobarSolicitudEmpleadoAction` con un `userId` arbitrario (p. ej. el de un `admin`).
2. Conseguir que `AuditLog` registre todas las escrituras de la operación bajo ese `usuarioId`.
3. Conseguir que las columnas `decididaPorUserId` de `SolicitudEmpleado` y `SolicitudEmpleadoTurno` apunten a ese usuario.

Eso permite repudiar una decisión propia, atribuir a otro, o ensuciar la pista de auditoría — relevante porque la app lo usa explícitamente para gobernanza.

## Por qué confianza 8 y no 10

- 8: El hallazgo es real al leer el código y el contrato de Next.js Server Actions. La explotación requiere conocer el ID de la action (estable por bundle, recuperable inspeccionando la red en una sesión legítima) y enviar el payload con la convención de bind. Es plausible y reproducible.
- No 10 porque no he ejecutado el ataque end-to-end ni he confirmado que el endpoint esté efectivamente registrado en el manifiesto de actions de Next 16 con esta versión exacta — pero la documentación oficial y el `"use server"` lo garantizan salvo bug de framework.

## Mitigación recomendada (no aplicada — modo plan)

Cambiar [`actions.ts:660-667`](../app/src/app/(app)/admin/solicitudes/actions.ts) a:
```ts
export async function aprobarSolicitudEmpleadoAction(
  _prev: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    const { user } = await requirePermiso("solicitudes.decidir");
    // ... usar user.id en lugar de userId en líneas 748, 779, 869, 879
```
Y actualizar el test [`aprobar-solicitud-empleado.test.ts`](../app/src/app/(app)/admin/solicitudes/__tests__/aprobar-solicitud-empleado.test.ts) para no pasar `userId` (la sesión ya está montada con `signInAs("admin")` en `beforeEach`).

El comentario que justifica el patrón ("para evitar re-leer la sesión dentro de la transacción") es un falso problema: `requirePermiso` se llama UNA vez antes del `$transaction`, igual que ya hacen los hermanos seguros.
