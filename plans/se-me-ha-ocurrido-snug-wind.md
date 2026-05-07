# Plan: tres mejoras UX (aviso de rechazo, edición activa, defaults por caseta)

## Context

Tres puntos de mejora detectados durante uso real:

1. **Aviso de rechazo a voluntarios**: hoy `rechazarSolicitudAction` solo cambia el estado en BD; el voluntario no se entera. No hay campo `email` en el modelo, no hay infra de envío, y el motivo del rechazo no se captura.
2. **Edición activa poco visible**: el dashboard muestra `edicion.nombre` y fechas en ISO crudo. Hay mucha información ya calculable (cobertura de turnos, voluntarios pendientes, días restantes, balance vivo) que no se está exponiendo, y la edición activa no aparece en el resto de páginas.
3. **Jornal por defecto desde caseta**: actualmente cada empleado tiene su `jornalDiario` individual y se introduce a mano en cada alta. Las casetas suelen tener un jornal "estándar" para sus empleados; precargarlo reduce errores y fricción.

Tres entregas independientes — pueden desplegarse por separado.

---

## Entrega 1 — Aviso de rechazo a voluntarios

### Decisiones

- **Sin infraestructura externa**: usar `mailto:` y `wa.me` que abren el cliente del admin con texto pre-redactado. Cero claves, cero bouncebacks.
- **Captura**: añadir `email` opcional al formulario, manteniendo `telefono` opcional, con validación a nivel de objeto: **al menos uno**.
- **Motivo**: nuevo campo `motivoRechazo` requerido en la action de rechazo (texto corto, max 500).

### Cambios de schema

[app/prisma/schema.prisma](app/prisma/schema.prisma) — modelo `SolicitudVoluntario` (líneas 397-417):

```prisma
email         String?
motivoRechazo String?  @db.Text  // se rellena al rechazar
```

`telefono` pasa a `String?` (hoy es obligatorio en BD; si hay datos, mantenerlo `String` y aplicar la regla "al menos uno" solo a nivel Zod en el formulario; verificar antes de migrar).

Migración: `npx prisma migrate dev --name solicitud_email_motivo_rechazo`.

### Cambios de código

- [app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx](app/src/app/apuntarse/[token]/_components/formulario-voluntario.tsx): añadir input `email` (type=email, opcional). Helper text: "Indica al menos email o teléfono".
- Schema Zod del formulario público: `.refine(d => d.email || d.telefono, { message: "Indica email o teléfono", path: ["email"] })`.
- [app/src/app/(app)/admin/solicitudes/schema.ts](app/src/app/(app)/admin/solicitudes/schema.ts): nuevo `rechazarSolicitudSchema` con `solicitudId` + `motivo` (string, 5-500).
- [app/src/app/(app)/admin/solicitudes/actions.ts](app/src/app/(app)/admin/solicitudes/actions.ts) `rechazarSolicitudAction`: persistir `motivoRechazo`. Devolver además `{ email, telefono, nombre, motivo }` en el `data` para que la UI pueda construir el enlace.
- Página `/admin/solicitudes`: tras rechazar, modal con dos botones según campos presentes:
  - **Enviar email** → `mailto:{email}?subject=...&body={plantilla con motivo}`
  - **Enviar WhatsApp** → `https://wa.me/{telefono normalizado}?text={plantilla con motivo}`
- Plantillas en español, en helper nuevo [app/src/lib/voluntario-aviso.ts](app/src/lib/voluntario-aviso.ts) con dos funciones: `construirMailto(solicitud, motivo)` y `construirWhatsapp(solicitud, motivo)`. Centralizado para reutilización futura.

### Verificación

- Apuntarse sin email ni teléfono → error de validación.
- Apuntarse solo con email → ok. Solo con teléfono → ok. Ambos → ok.
- Rechazar sin motivo → error. Con motivo → BD actualizada y modal con botones según canales disponibles.
- Click en mailto/wa.me abre el cliente correspondiente con texto pre-redactado.

---

## Entrega 2 — Edición activa: banda de cabecera + cards en dashboard

### Banda de cabecera global

Componente nuevo [app/src/components/edicion-banner.tsx](app/src/components/edicion-banner.tsx) (server component) renderizado en el layout `(app)` ([app/src/app/(app)/layout.tsx](app/src/app/(app)/layout.tsx)).

Contenido:
- Nombre + año de la edición activa.
- Rango de fechas humanizado (`5 may – 12 may 2026`) con `Intl.DateTimeFormat("es-ES")`.
- Días restantes / "en curso" / "finalizada" / "empieza en X días".
- Barra de progreso temporal (días transcurridos / total).

Reutiliza `obtenerEdicionActiva()` de [app/src/lib/edicion.ts](app/src/lib/edicion.ts).

Si no hay edición activa → mostrar un CTA hacia `/admin/ediciones`.

### Cards adicionales en dashboard

Añadir a [app/src/lib/dashboard.ts](app/src/lib/dashboard.ts) las siguientes agregaciones (reutilizando edición activa ya hidratada):

- **Cobertura de turnos** — `% de TurnoPlaza cubiertas vs. esperadas` agregando `TurnoPlaza.cantidad` vs. `count(TurnoEmpleado)` para los turnos de la edición.
- **Voluntarios** — `count(SolicitudVoluntario)` por estado (pendiente / aprobada / rechazada) para la edición.
- **Pedidos pendientes** — `count(Pedido where estado != recibido)`.
- **Stock crítico** — `count(Producto where stockActual < stockMinimo)` (verificar si esos campos existen; si no, omitir esta card).

Renderizar 3-4 cards nuevas en el grid existente de [app/src/app/(app)/page.tsx](app/src/app/(app)/page.tsx) usando los componentes de Card ya presentes en `components/ui/`.

### Verificación

- Banda visible en todas las páginas autenticadas con cifras correctas para la edición activa.
- Sin edición activa → banda con CTA.
- Dashboard muestra cards nuevas con cifras coherentes (validar con datos reales del seed o creando turnos/solicitudes).

---

## Entrega 3 — Jornal/perfil por defecto en Caseta

### Decisión clave

`Empleado` **sigue siendo transversal** (sin FK a Caseta). El default es solo una **conveniencia de UI**: al crear un empleado, el admin selecciona opcionalmente "Precargar desde caseta" y los campos `jornalDiario` y `perfil` se rellenan en el formulario con los defaults de esa caseta — pero permanecen editables y nada se persiste en la relación.

### Cambios de schema

[app/prisma/schema.prisma](app/prisma/schema.prisma) — modelo `Caseta` (líneas 120-136):

```prisma
jornalDiarioDefault Decimal?         @db.Decimal(10, 2)
perfilDefecto       PerfilEmpleado?
```

Migración: `npx prisma migrate dev --name caseta_defaults_empleado`.

### Cambios de código

- [app/src/app/(app)/admin/casetas/schema.ts](app/src/app/(app)/admin/casetas/schema.ts): añadir `jornalDiarioDefault` (coerce number, 0-9999.99, opcional) y `perfilDefecto` (enum opcional).
- [app/src/app/(app)/admin/casetas/caseta-form.tsx](app/src/app/(app)/admin/casetas/caseta-form.tsx): dos inputs nuevos en el formulario (input numérico + select de perfil).
- [app/src/app/(app)/admin/casetas/actions.ts](app/src/app/(app)/admin/casetas/actions.ts): `crearCasetaAction` y `actualizarCasetaAction` aceptan los nuevos campos.
- [app/src/app/(app)/admin/empleados/empleado-form.tsx](app/src/app/(app)/admin/empleados/empleado-form.tsx): nuevo `Select` "Precargar desde caseta" **al inicio del formulario** (solo en modo creación, no edición). Recibe `casetas` como prop con `{ id, nombre, jornalDiarioDefault, perfilDefecto }`. Al cambiar el select, llamar `form.setValue("jornalDiario", caseta.jornalDiarioDefault)` y `form.setValue("perfil", caseta.perfilDefecto)`. El usuario sigue pudiendo editar.
- Página padre [app/src/app/(app)/admin/empleados/page.tsx](app/src/app/(app)/admin/empleados/page.tsx) (o donde se renderice el form de creación): cargar las casetas activas con sus defaults y pasarlas al form.

No se cambia `actions.ts` de empleados — la persistencia sigue siendo por valor explícito.

### Verificación

- Editar caseta → guardar `jornalDiarioDefault=85`, `perfilDefecto=trabajador`.
- Crear empleado → seleccionar esa caseta → el form muestra 85 y trabajador. Cambiar a 90 → se guarda 90.
- Crear empleado sin seleccionar caseta → comportamiento actual intacto.
- Editar empleado existente → no aparece el selector (solo en creación).

---

## Orden sugerido de despliegue

1. **Entrega 3** primero: cambio aislado, bajo riesgo, alto valor diario.
2. **Entrega 2** después: solo lectura, no rompe nada.
3. **Entrega 1** al final: requiere migración con campos nullable y coordinación de la UI de rechazo.

Cada entrega cierra con `npm run lint` + `npm run build` verde y, en local, `npx prisma migrate dev` aplicada al branch `dev` de Neon antes de subir a producción.
