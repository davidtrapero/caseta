# Plan — 6 mejoras transversales (caja, turnos, voluntarios, auth)

## Context

El usuario pidió coordinar el análisis y plan de 6 mejoras independientes en la app:

1. Balance: filtro por caseta + gráfico diario (ingresos / gastos / nóminas).
2. Exportar asistencias a Excel (XLSX nativo).
3. Plantillas editables para mensajes de rechazo de voluntarios (email + WhatsApp).
4. Buscador por nombre dentro del desplegable de asignar empleado a turno.
5. Flujo de cambio de contraseña (self + reset por admin).
6. Colores distintos para turnos según franja horaria.

Son features independientes pero se planifican juntas para mergear en el orden que minimice conflictos y para preparar una capa cross-cutting (Nodemailer, Recharts, ExcelJS, helper de normalización) en una sola fase de prep.

### Decisiones del usuario (cerradas en preguntas previas)

- **Nóminas en gráfico**: solo total acumulado, no se prorratean por día.
- **Exportar a Excel**: XLSX nativo (`exceljs`), no mejora del CSV.
- **Plantillas rechazo**: email automático vía Nodemailer + SMTP corporativo. WhatsApp **no automático** — `wa.me` pre-rellenado con plantilla.
- **Cambio de contraseña**: usuario propio + admin puede resetear a cualquiera.

### Verificación previa al plan (importante)

Tras leer [app/src/app/(app)/turnos/_lib/fechas.ts:1-11](app/src/app/(app)/turnos/_lib/fechas.ts#L1-L11), confirmo que el repo usa la convención **"naive UTC"** documentada: los turnos se guardan en UTC pero el reloj UTC es el reloj de pared. La función [`franjaHoraria()`](app/src/app/(app)/turnos/_lib/fechas.ts#L173-L178) con `getUTCHours()` es **correcta** según esa convención. No hay bug de timezone; solo se ajustan los umbrales.

---

## Fase 0 — Cross-cutting prep (mergeable sin impacto UI)

**Objetivo**: instalar deps y helpers que necesitan varias fases.

**Crear**:
- [app/src/lib/email.ts](app/src/lib/email.ts) — wrapper Nodemailer con `getTransporter()` lazy-singleton y `enviarEmail({ to, subject, text, replyTo? })`. Devuelve `{ ok: true, messageId } | { ok: false, error }`. **No lanza** — los callers deciden si abortar.
- [app/src/lib/text-normalize.ts](app/src/lib/text-normalize.ts) — `normalizar(s)`: lowercase + `String.prototype.normalize("NFD").replace(/\p{Diacritic}/gu, "")`. Reusable F4 y futuros buscadores.

**Modificar**:
- [app/src/app/(app)/turnos/_lib/fechas.ts:173-178](app/src/app/(app)/turnos/_lib/fechas.ts#L173-L178) — ajustar umbrales de `franjaHoraria` a los pedidos:
  - `h < 15` → mañana
  - `15 ≤ h < 22` → tarde (absorbe el "hasta 19h" del usuario; evita 4ª franja)
  - `h ≥ 22` → noche
  - Mantener `getUTCHours()` (convención del repo). Actualizar JSDoc.
- [app/.env.example](app/.env.example) (o crearlo) — añadir `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`.

**npm**: `nodemailer`, `@types/nodemailer`, `recharts`, `exceljs`.

**Verificación**: `npm run lint` y `npm run build` verdes. `franjaHoraria` con inputs 14:00 / 15:00 / 21:59 / 22:00 / 03:00 devuelve mañana / tarde / tarde / noche / noche.

**Riesgo**: si hay otros consumidores de `franjaHoraria` en el repo con otros umbrales asumidos, grep antes de mergear.

---

## Fase 1 — Filtro buscador en `AsignarEmpleado` (mínima)

**Objetivo**: campo de búsqueda dentro del Popover de asignar empleado.

**Modificar**:
- [app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx](app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx) —
  - `useState("")` para `query`, reset al abrir.
  - `<Input type="search" placeholder="Buscar..." autoFocus>` arriba del listado.
  - Filtrar `disponibles` con `normalizar(nombre).includes(normalizar(query))` antes de agrupar por tipo.
  - Mensaje "Sin coincidencias" si vacío y query no vacía.

**Decisiones**:
- Filtro client-side puro, sin debounce (≤30 empleados típicos).
- Patrón visual: replica el `<Input type="search">` de [empleados-filters.tsx:94-100](app/src/app/(app)/empleados/_components/empleados-filters.tsx#L94-L100).

**Verificación**: abrir popover, escribir "jose" filtra; tildes ignoradas; reabrir limpia el query.

---

## Fase 2 — Exportar asistencias a XLSX nativo

**Objetivo**: sustituir CSV por XLSX con cabecera negrita, anchuras y autofiltro.

**Modificar**:
- [app/src/app/(app)/turnos/asistencias/exportar/route.ts](app/src/app/(app)/turnos/asistencias/exportar/route.ts) — quitar `BOM` / `toCsvRow`, usar `ExcelJS.Workbook`:
  - `addWorksheet("Asistencias")`.
  - Row 1 cabeceras con `font.bold = true`.
  - Anchuras: nombre 28, tipo 14, entidad 22, dni 12, telefono 14, caseta 18, fechas 18.
  - `autoFilter` en cabecera y `views = [{ state: "frozen", ySplit: 1 }]`.
  - Fechas como `Date` con `numFmt = "yyyy-mm-dd hh:mm"`.
  - Buffer con `workbook.xlsx.writeBuffer()`.
  - Headers: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, filename `.xlsx`.
- [app/src/app/(app)/turnos/asistencias/page.tsx:108-115](app/src/app/(app)/turnos/asistencias/page.tsx#L108-L115) — actualizar copy del botón si dice "CSV".

**Reutiliza**: `cargarAsistencias()` de [_lib/query.ts](app/src/app/(app)/turnos/asistencias/_lib/query.ts) sin cambios.

**Verificación**: descarga `.xlsx`, abre en Excel, cabecera congelada, autofiltro activo, filtros `?tipos=...&entidadId=...&casetaId=...` siguen funcionando.

**Riesgo**: ExcelJS en memoria está bien hasta 50k filas; añadir TODO si supera (no es escenario actual).

---

## Fase 3 — Colores por franja horaria en turnos

**Objetivo**: tintar los bloques de turno según franja con la paleta del repo, manteniendo estética glass.

**Crear**:
- [app/src/app/(app)/turnos/_lib/franja-color.ts](app/src/app/(app)/turnos/_lib/franja-color.ts) — `coloresFranja(franja: FranjaHoraria): { bg, border, barra, label }`. Mapea:
  - mañana → `--primary` (latón).
  - tarde → `--secondary` (ocre-cuero).
  - noche → `--accent` (verde oliva).
  - Usar `color-mix(in oklab, var(--primary) 12%, transparent)` para fondos suaves que se integren con el glass.

**Modificar**:
- [app/src/app/(app)/turnos/types.ts](app/src/app/(app)/turnos/types.ts) — añadir `franja: FranjaHoraria` a `TurnoSerializable`.
- Serializadores que producen `TurnoSerializable` (grep `TurnoSerializable` para localizarlos) — añadir `franja: franjaHoraria(t.fechaInicio.toISOString())` en server, así no se recalcula en N componentes.
- [app/src/app/(app)/turnos/_components/BloqueTurno.tsx:65-72](app/src/app/(app)/turnos/_components/BloqueTurno.tsx#L65-L72) — leer `turno.franja`:
  - Sustituir el `bg-[var(--surface-glass)]` plano por `style={{ background: linear-gradient(135deg, ${colores.bg}, var(--surface-glass)) }}`.
  - Añadir `border-l-4` con `colores.barra` como afordancia visual fuerte.
- Otros lugares que pintan turnos (verificar al implementar): vista semana, [imprimir/page.tsx](app/src/app/(app)/turnos/imprimir/page.tsx), [exportar/dia/page.tsx](app/src/app/(app)/turnos/exportar/dia/page.tsx), [_components/turnos-hoy.tsx](app/src/app/(app)/_components/turnos-hoy.tsx). En las hojas imprimibles mantener solo la barra lateral coloreada (los fondos no imprimen bien).

**Decisiones**:
- Clasificar en server (vía `franjaHoraria` ya existente) en vez de cliente — payload limpio, una sola fuente de verdad.
- Color suave + barra lateral fuerte → no rompe estética glass y es accesible.

**Depende de**: Fase 0 (umbrales nuevos).

**Verificación**: turnos a 09:00 / 17:00 / 23:00 muestran tres tonos distintos en día/semana/dashboard; impresión conserva la barra lateral.

---

## Fase 4 — Balance: filtro por caseta + gráfico diario

**Objetivo**: filtrar `/caja/balance` por caseta vía URL y añadir chart diario ingresos/gastos.

**Crear**:
- [app/src/app/(app)/caja/balance/_components/SelectorCasetaBalance.tsx](app/src/app/(app)/caja/balance/_components/SelectorCasetaBalance.tsx) — wrapper client de [SelectorCaseta.tsx](app/src/app/(app)/turnos/_components/SelectorCaseta.tsx) (URLSearchParams). Incluye opción "Todas".
- [app/src/app/(app)/caja/balance/_components/GraficoDiario.tsx](app/src/app/(app)/caja/balance/_components/GraficoDiario.tsx) — `"use client"` con Recharts `ComposedChart`: barras gastos, línea ingresos. Recibe `data: { fecha, ingresos, gastos }[]`.
- [app/src/app/(app)/caja/balance/_lib/series.ts](app/src/app/(app)/caja/balance/_lib/series.ts) — `construirSerieDiaria(cierres, gastos)` que normaliza fechas a `YYYY-MM-DD` y rellena días sin movimiento entre min y max (eje X continuo).

**Modificar**:
- [app/src/app/(app)/caja/balance/page.tsx](app/src/app/(app)/caja/balance/page.tsx) —
  - Aceptar `searchParams: Promise<{ casetaId?: string }>` (Next 16).
  - Aplicar `casetaId` (si presente) al `where` de `cierreDiario` y `gasto`. Para gastos, incluir `OR: [{ casetaId }, { casetaId: null }]` (los gastos generales se suman siempre cuando hay filtro). Mostrar chip explicativo "incluye gastos generales".
  - Nóminas se mantienen globales con etiqueta "Total nóminas (no filtra por caseta)" — sin línea diaria, según decisión.
  - Añadir 2 queries paralelas: `cierreDiario.findMany({ select: { fecha, ingresosTotales }, where })` y `gasto.findMany({ select: { fecha, monto }, where })` para alimentar `construirSerieDiaria`.
  - Cargar lista de casetas para el selector.
  - Render del selector arriba del header y del chart en `<section>` antes del grid.

**Reutiliza**:
- [`obtenerEdicionActiva()`](app/src/lib/edicion.ts) y `requireRole()` ya en uso.
- Patrón visual de `BalanceCard` y secciones existentes en [balance/page.tsx:112-225](app/src/app/(app)/caja/balance/page.tsx#L112-L225).

**Decisiones**:
- **Recharts** sobre Tremor (SSR-friendly, peso menor, sin Heroicons forzados).
- Gastos `casetaId=null` se suman cuando se filtra por caseta — su exclusión deformaría el resultado neto de esa caseta.
- Toda la agregación en server (RSC); chart cliente solo dibuja.

**Verificación**: `/caja/balance` muestra chart con datos; aplicar `?casetaId=<id>` reduce ingresos a esa caseta y mantiene gastos generales con chip; sin edición activa, `EmptyState` no rompe.

**Riesgo**: si Recharts da warnings de hidratación con Next 16/React 19, envolver en `dynamic(() => import(...), { ssr: false })`.

---

## Fase 5 — Cambio de contraseña (self + admin reset)

**Objetivo**: usuario cambia su propia contraseña; admin puede resetear la de cualquier usuario.

**Modificar**:
- [app/src/lib/auth.ts](app/src/lib/auth.ts) — añadir plugin `admin()` de `better-auth/plugins` (ya viene con `better-auth`). Verificar con `prisma migrate diff` si exige columnas extra; aplicar migración si la hay.
- [app/src/app/(app)/admin/usuarios/actions.ts](app/src/app/(app)/admin/usuarios/actions.ts) — añadir `resetearPasswordAction`:
  - `requireRole(["admin"])`.
  - Zod: `userId`, `nuevaPassword.min(8)`.
  - `withAuditContext(user.id, …)`.
  - Llama `auth.api.setUserPassword({ body: { userId, newPassword }, headers: await headers() })`.
  - `revalidatePath("/admin/usuarios")`.
- [app/src/app/(app)/admin/usuarios/page.tsx](app/src/app/(app)/admin/usuarios/page.tsx) — botón "Resetear contraseña" por fila que abre dialog.
- [app/src/app/(app)/_components/sidebar-nav.tsx:86-145](app/src/app/(app)/_components/sidebar-nav.tsx#L86-L145) — link "Cambiar contraseña" antes del logout en sección usuario.

**Crear**:
- [app/src/app/(app)/cuenta/password/page.tsx](app/src/app/(app)/cuenta/password/page.tsx) — RSC con form.
- [app/src/app/(app)/cuenta/password/_components/FormCambiarPassword.tsx](app/src/app/(app)/cuenta/password/_components/FormCambiarPassword.tsx) — client form con `useActionState`. Patrón replicado de [login-form.tsx](app/src/app/login/login-form.tsx).
- [app/src/app/(app)/cuenta/password/actions.ts](app/src/app/(app)/cuenta/password/actions.ts) — `cambiarPasswordAction`:
  - `requireRole(["admin","gerente","cajero"])`.
  - Zod: `currentPassword`, `newPassword.min(8)`, `repetir` con refine.
  - `auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: true }, headers: await headers() })`.
- [app/src/app/(app)/admin/usuarios/_components/DialogoResetearPassword.tsx](app/src/app/(app)/admin/usuarios/_components/DialogoResetearPassword.tsx) — dialog con campo `nuevaPassword` y botón "Resetear".

**Decisiones**:
- Plugin admin de Better Auth (mantenible) sobre hashear manualmente (frágil ante upgrades).
- Dos rutas separadas — la self pide `currentPassword`, el admin no.
- `revokeOtherSessions: true` en self-change.
- Min 8 caracteres, sin reglas adicionales.
- Sin email de notificación al resetear (se puede añadir después usando `lib/email.ts`).

**Verificación**: login A → cambiar a B → logout → login con B; admin resetea password de otro usuario; cajero recibe 403 al intentar la action de admin.

**Riesgo**: el plugin admin de Better Auth puede crear columnas extra — `prisma migrate diff` antes de mergear.

---

## Fase 6 — Plantillas rechazo voluntarios + email automático + wa.me pre-rellenado

**Objetivo**: persistir plantillas en BD, enviar email al rechazar, generar URL `wa.me` con plantilla.

**Schema** ([app/prisma/schema.prisma](app/prisma/schema.prisma)):

```prisma
model PlantillaMensaje {
  id          String   @id @default(cuid())
  clave       String   @unique
  asunto      String?
  cuerpo      String   @db.Text
  descripcion String?
  variables   String[]
  updatedAt   DateTime @updatedAt
  updatedById String?
}
```

**Crear**:
- [app/src/lib/plantillas.ts](app/src/lib/plantillas.ts):
  - `obtenerPlantilla(clave)` con `unstable_cache` tag `"plantillas"`.
  - `renderPlantilla(cuerpo, vars)` — `cuerpo.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))`. Text-only por contrato (escapado HTML separado si en el futuro se quiere html).
  - Constante `VARIABLES_RECHAZO_VOLUNTARIO = ["nombre","motivo","turnos","caseta","fechas"]`.
- [app/src/app/(app)/admin/ajustes/page.tsx](app/src/app/(app)/admin/ajustes/page.tsx) — RSC con lista de plantillas editables.
- [app/src/app/(app)/admin/ajustes/_components/EditorPlantilla.tsx](app/src/app/(app)/admin/ajustes/_components/EditorPlantilla.tsx) — form con asunto, cuerpo y chips clicables que insertan placeholders en el textarea.
- [app/src/app/(app)/admin/ajustes/actions.ts](app/src/app/(app)/admin/ajustes/actions.ts) — `actualizarPlantillaAction` con `requireRole(["admin"])`, `withAuditContext`, valida que las variables usadas en `cuerpo` están en la whitelist (rechaza `{password}` etc.), `revalidateTag("plantillas")`.

**Modificar**:
- [app/prisma/seed.ts](app/prisma/seed.ts) — `upsert` por clave para sembrar `rechazo_voluntario_email` y `rechazo_voluntario_whatsapp` con los textos actuales de [voluntario-aviso.ts](app/src/lib/voluntario-aviso.ts).
- [app/src/lib/voluntario-aviso.ts](app/src/lib/voluntario-aviso.ts) — funciones async que reciben `vars` y devuelven `{ subject, body, mailto, whatsappUrl }` usando plantillas BD. `whatsappUrl` con `encodeURIComponent` igual que ahora.
- [app/src/app/(app)/admin/solicitudes/actions.ts:256-320](app/src/app/(app)/admin/solicitudes/actions.ts#L256-L320) (`rechazarTurnosAction`) — tras la transacción:
  - Construir `vars` con datos del rechazo (turnos formateados con caseta+fechas).
  - Si `solicitud.email`: `enviarEmail({ to, subject, text })` con plantilla email. **Capturar fallo, log, no abortar** — el rechazo ya está en BD.
  - Devolver `{ ok, emailEnviado }`.
- Componente cliente que muestra el aviso post-rechazo (consumidor de `rechazarTurnosAction`):
  - "Email enviado a X" o botón fallback "Reintentar email" si falló.
  - Botón WhatsApp con la URL pre-rellenada (sin envío automático).
- Sidebar admin / [admin/layout.tsx:4-12](app/src/app/(app)/admin/layout.tsx#L4-L12) — añadir tab "Ajustes" → `/admin/ajustes`.

**Decisiones**:
- Modelo genérico `PlantillaMensaje` con `clave` única — reusable para confirmaciones, recordatorios futuros.
- Plantillas separadas para email y WhatsApp — evita el problema de doble-escape (HTML en email, urlencode en WhatsApp).
- Email no transaccional — fallo no aborta el rechazo, log + flag UI.
- Whitelist de variables validada server-side al guardar.

**Verificación**:
- Editar plantilla email en `/admin/ajustes`, rechazar voluntario con email → llega correo con texto nuevo y `{nombre}` sustituido.
- Sin SMTP_HOST → action sigue OK, devuelve `emailEnviado: false`.
- WhatsApp → URL `wa.me/<tel>?text=<plantilla rellenada>`.
- Cajero accediendo a `/admin/ajustes` → 403.

**Riesgos**:
- SMTP corporativo bloqueado en Vercel (puertos 25/587). Probar early; si falla, alternativa Resend.
- Cache `unstable_cache` con `revalidateTag` — si admin edita y consumidor cachea, el siguiente rechazo aún puede usar versión vieja unos segundos. Aceptable.
- `voluntario-aviso.ts` se vuelve async — actualizar todos los callers en el mismo PR (grep).

---

## Orden recomendado y por qué

| # | Fase | Justificación |
|---|------|---------------|
| 0 | Cross-cutting prep | Habilita todo lo demás. Cero impacto UI. |
| 1 | Filtro AsignarEmpleado | Diminuta, sin BD, riesgo nulo. Útil de inmediato. |
| 2 | XLSX asistencias | Aislada en route handler. |
| 3 | Colores franja | Depende de F0 (umbrales). Toca `turnos/` pero acotado. |
| 4 | Balance gráfico | Independiente, mediano. |
| 5 | Cambio contraseña | Toca `auth.ts` (potencial migración). Mayor riesgo. |
| 6 | Plantillas + email | La más amplia: schema + seed + UI admin + flujo rechazo. |

Las fases pequeñas primero generan confianza y mantienen el repo verde; los cambios con migración Prisma (F6) y/o cambios en `auth.ts` (F5) van al final.

---

## Riesgos cruzados

- **Umbrales `franjaHoraria`** (F0 ↔ F3): F3 depende del ajuste de F0. Mergear F0 antes.
- **Plantillas y escapado** (F6): mantener plantillas separadas email/WhatsApp evita el problema. `renderPlantilla` es text-only por contrato.
- **Plugin admin Better Auth** (F5): verificar `prisma migrate diff` antes de aplicar.
- **SMTP en serverless** (F0/F6): probar el envío real en preprod cuanto antes; F6 tiene fallback que no aborta el rechazo.
- **Rewrite a async de `voluntario-aviso.ts`** (F6): los callers actuales son sync — actualizarlos en el mismo PR.
- **Recharts SSR** (F4): plan B `dynamic({ ssr: false })` listo si hay warnings de hidratación.
- **Filtro caseta y gastos generales** (F4): la decisión cambia números frente al estado actual sin filtro — chip explicativo en UI evita confusión.

---

## Archivos críticos para ejecución

- [app/prisma/schema.prisma](app/prisma/schema.prisma) — modelo `PlantillaMensaje` (F6).
- [app/src/lib/auth.ts](app/src/lib/auth.ts) — plugin admin (F5).
- [app/src/app/(app)/turnos/_lib/fechas.ts](app/src/app/(app)/turnos/_lib/fechas.ts) — umbrales franja (F0).
- [app/src/app/(app)/turnos/_components/BloqueTurno.tsx](app/src/app/(app)/turnos/_components/BloqueTurno.tsx) — colores (F3).
- [app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx](app/src/app/(app)/turnos/_components/AsignarEmpleado.tsx) — buscador (F1).
- [app/src/app/(app)/caja/balance/page.tsx](app/src/app/(app)/caja/balance/page.tsx) — filtro + chart (F4).
- [app/src/app/(app)/turnos/asistencias/exportar/route.ts](app/src/app/(app)/turnos/asistencias/exportar/route.ts) — XLSX (F2).
- [app/src/lib/voluntario-aviso.ts](app/src/lib/voluntario-aviso.ts) — plantillas (F6).
- [app/src/app/(app)/admin/solicitudes/actions.ts](app/src/app/(app)/admin/solicitudes/actions.ts) — envío email (F6).
