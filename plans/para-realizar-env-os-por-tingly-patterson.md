# Plan: Envíos por WhatsApp — extensión a aprobaciones

## Contexto

El sistema ya tiene infraestructura completa para WhatsApp en rechazos: `voluntario-aviso.ts` construye una URL `wa.me/...` con mensaje pre-rellenado desde plantillas BD, y el modal de rechazo la expone como botón. El admin hace clic, se abre WhatsApp con el texto listo, y lo envía.

Lo que **falta** es replicar ese mismo patrón para las **aprobaciones** de voluntarios y empleados. Actualmente `aprobarTurnosAction` y `aprobarSolicitudEmpleadoAction` completan la operación sin devolver ningún dato de notificación al cliente.

El usuario eligió botón manual (wa.me) — sin APIs externas, sin coste, misma UX que ya conoce.

---

## Archivos críticos

| Archivo | Rol |
|---|---|
| [app/src/lib/voluntario-aviso.ts](app/src/lib/voluntario-aviso.ts) | Construye avisos de rechazo → extender con `construirAvisoAprobacion()` |
| [app/src/lib/plantillas.ts](app/src/lib/plantillas.ts) | `obtenerPlantilla(clave)` + `renderPlantilla()` — reutilizar tal cual |
| [app/src/app/(app)/admin/solicitudes/actions.ts](app/src/app/(app)/admin/solicitudes/actions.ts) | `aprobarTurnosAction` (voluntarios) + `aprobarSolicitudEmpleadoAction` (empleados) |
| [app/src/app/(app)/admin/solicitudes/_components/acciones.tsx](app/src/app/(app)/admin/solicitudes/_components/acciones.tsx) | Modal de rechazo con botón WhatsApp → añadir modal/botón de aprobación |
| [app/prisma/seed.ts](app/prisma/seed.ts) | Siembra plantillas — añadir claves de aprobación |
| [app/src/app/(app)/admin/ajustes/page.tsx](app/src/app/(app)/admin/ajustes/page.tsx) | UI de edición de plantillas — añadir las nuevas |

---

## Implementación

### Paso 1 — Nuevas plantillas en seed.ts

Añadir dos plantillas en el bloque `upsert` de plantillas:

```
clave: "aprobacion_voluntario_whatsapp"
cuerpo: "Hola {nombre}, tu solicitud de voluntario ha sido aprobada. Se te han asignado {turnos} turno(s) en {caseta} los días {fechas}. ¡Muchas gracias!"
variables: ["nombre", "turnos", "caseta", "fechas"]

clave: "aprobacion_empleado_whatsapp"
cuerpo: "Hola {nombre}, tu solicitud ha sido aprobada. Tienes {turnos} turno(s) asignado(s) en {caseta} los días {fechas}. Cualquier duda, contacta con el equipo."
variables: ["nombre", "turnos", "caseta", "fechas"]
```

Ejecutar `npx tsx prisma/seed.ts` para sembrar en el branch dev.

### Paso 2 — Extender `voluntario-aviso.ts`

Añadir función `construirAvisoAprobacion(telefono, vars)` siguiendo el mismo patrón que `construirAvisoRechazo`:

- Carga plantilla `aprobacion_voluntario_whatsapp` (o `aprobacion_empleado_whatsapp` según parámetro `tipo`)
- Renderiza con `renderPlantilla()`
- Construye y devuelve `{ whatsappUrl, cuerpoWhatsapp }` (sin email en aprobación)

Variables a pasar: `nombre`, `turnos` (count como string), `caseta` (nombre), `fechas` (lista resumida).

### Paso 3 — Actualizar `aprobarTurnosAction` (voluntarios)

Al final de la transacción, si la solicitud tiene `telefono`:
1. Recopilar nombres de casetas y fechas de los turnos aprobados en esta llamada
2. Llamar `construirAvisoAprobacion(telefono, vars)`
3. Devolver `{ ok: true, data: { ..., whatsappUrl, aprobados: count } }`

Si no hay teléfono, `whatsappUrl: null`.

### Paso 4 — Actualizar `aprobarSolicitudEmpleadoAction` (empleados)

Mismo patrón. El teléfono viene de `SolicitudEmpleado.telefono`. Usar clave `aprobacion_empleado_whatsapp`.

### Paso 5 — UI: botón WhatsApp post-aprobación en `acciones.tsx`

En el componente cliente que gestiona la aprobación de turnos, cuando la action devuelva `whatsappUrl != null`, mostrar un toast/modal ligero con:

- Texto: "Turnos aprobados. ¿Notificar al voluntario?"
- Botón "Abrir WhatsApp" → `window.open(whatsappUrl, '_blank')`
- Botón "Omitir"

Seguir el mismo patrón visual del `AvisoRechazo` existente (líneas ~250-350 de `acciones.tsx`).

### Paso 6 — UI de ajustes: exponer las nuevas plantillas

En [app/src/app/(app)/admin/ajustes/page.tsx](app/src/app/(app)/admin/ajustes/page.tsx), añadir `EditorPlantilla` para las dos claves nuevas, agrupadas bajo un encabezado "Aprobaciones".

---

## Variables de plantilla

Las variables `{turnos}`, `{caseta}` y `{fechas}` se construyen en la server action a partir de los `TurnoEmpleado` creados en esa misma operación:

- `turnos`: `aResueltos.length.toString()`
- `caseta`: nombre de la caseta del primer turno (o "la caseta" si hay varias)
- `fechas`: lista de fechas formateadas `dd/MM` separadas por comas, máx 5 + "..."

---

## Verificación

1. Correr `npx tsx prisma/seed.ts` → confirmar en `/admin/ajustes` que aparecen las plantillas nuevas y son editables.
2. Aprobar un turno de voluntario en `/admin/solicitudes` → confirmar que aparece el botón WhatsApp.
3. Hacer clic → verificar que se abre `wa.me/` con el mensaje correcto y el número normalizado.
4. Repetir con solicitud de empleado.
5. Probar caso sin teléfono → botón no aparece, flujo no se rompe.
