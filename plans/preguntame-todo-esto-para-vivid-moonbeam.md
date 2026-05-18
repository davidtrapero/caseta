# Refresh prod → preprod con ofuscación de PII

## Contexto

Hoy preprod tiene su propio dataset desordenado (datos de pruebas acumulados). Queremos llenarlo con un clon limpio de prod para validar features con datos realistas, pero **sin exponer PII** ya que QA y colaboradores tendrán acceso a preprod.

Además, la búsqueda en el repo confirma que **hoy no se ofusca nada** en BBDD que no sean prod: no existe ningún script de anonimización, el workflow [.github/workflows/migrate-preprod.yml](.github/workflows/migrate-preprod.yml) solo aplica migraciones, y los seeds ([app/prisma/seed.ts](app/prisma/seed.ts), [app/prisma/seed.prod.ts](app/prisma/seed.prod.ts)) son solo bootstrap. Hasta hoy no hay riesgo porque preprod nunca se ha clonado de prod, pero ese riesgo aparece en cuanto hagamos el clon — por eso esta tarea **incluye la ofuscación como parte del refresh**, no como paso opcional.

Decisiones tomadas con el usuario:
- **Método**: Script Node + Prisma (lee de prod, transforma en memoria, escribe en preprod).
- **Audiencia preprod**: usuario + QA/colaboradores → ofuscación obligatoria completa.
- **Frecuencia**: manual recurrente (`npm run refresh:preprod`).
- **Auth**: mantener solo users con rol `admin`, password reseteado, emails ofuscados; borrar `Session`/`Account` no-admin/`Verification`.
- **AuditLog**: borrar todo.
- **Voluntarios**: ofuscar nombre/email/teléfono/observaciones/motivoRechazo, mantener estructura y FKs.
- **URLs**: `.env.refresh` (gitignored) con `DATABASE_URL_PROD` y `DATABASE_URL_PREPROD`.
- **Verificación**: asserts post-refresh; el script falla si detecta leaks.
- **Faker**: `@faker-js/faker` con locale `es`.
- **Volumetría**: clonar todas las tablas operativas tal cual.
- **Ubicación**: [app/scripts/refresh-preprod.ts](app/scripts/refresh-preprod.ts) + npm script.

## Implementación

### 1. Dependencia y configuración

- `npm i -D @faker-js/faker` desde `app/`.
- Añadir `.env.refresh` a `.gitignore` (si no está ya cubierto por `.env*`).
- Crear `app/.env.refresh.example` con plantilla:
  ```
  DATABASE_URL_PROD="postgresql://..."
  DATABASE_URL_PREPROD="postgresql://..."
  ```

### 2. Script principal: [app/scripts/refresh-preprod.ts](app/scripts/refresh-preprod.ts)

Estructura por fases. Cada fase con log claro y conteos.

**Fase 0 — Guardas de seguridad** (críticas, abortan si fallan):
- Cargar `.env.refresh` con `dotenv` (ruta explícita, no `.env.local`).
- Verificar que `DATABASE_URL_PROD` y `DATABASE_URL_PREPROD` están definidos y son **distintos**.
- Verificar que `DATABASE_URL_PREPROD` **no contiene** la palabra `prod` aislada (heurística simple para evitar inversión accidental). Mejor: pedir confirmación interactiva mostrando los hosts (`readline`) → "Vas a borrar TODO en `<host-preprod>` y reemplazarlo con `<host-prod>`. Escribe REFRESH para continuar".
- Crear dos `PrismaClient` con `datasourceUrl` distinto: `prismaProd` (read-only por convención) y `prismaPreprod`.

**Fase 1 — Wipe preprod**: reutilizar el patrón de [app/src/test/db-reset.ts](app/src/test/db-reset.ts) (TRUNCATE CASCADE de las 17 tablas) ejecutado contra `prismaPreprod`. Ese fichero ya tiene la lista correcta — replicar la query con la connection de preprod.

**Fase 2 — Lectura desde prod** (en orden de dependencias): TipoEmpleado, EntidadVoluntario, User (solo admins), Caseta, Edicion, Producto, Stock, Proveedor, Empleado, Turno, TurnoPlaza, TurnoEmpleado, Pedido, DetallePedido, MovimientoStock, CierreDiario, Gasto, Nomina, SolicitudVoluntario, SolicitudVoluntarioTurno.

**Fase 3 — Transformaciones PII en memoria**:
- `User`: filtrar `where rol = 'admin'`. Mapear `email → admin{N}@preprod.local`, `name → faker.person.fullName({ locale: es })`, `image → null`. Mantener `id` (FKs en Gasto/Movimiento dependen).
- `Empleado`: `nombre → faker.person.fullName()`, `dni → null` (es opcional y único, evitamos colisiones), `telefono → faker.phone.number({ style: 'national' })` con locale `es`, `email → empleado{id}@preprod.local`. Mantener `jornalDiario`, FKs.
- `SolicitudVoluntario`: `nombre`, `email → voluntario{id}@preprod.local`, `telefono` igual que empleado. `observaciones → null`, `motivoRechazo → null`.
- `SolicitudVoluntarioTurno`: `motivoRechazo → null`.
- `Proveedor`: `contacto → faker.person.fullName()`, `email → proveedor{id}@preprod.local`, `telefono` fake. `nombre` se mantiene (no es PII de persona física típicamente — son negocios).
- `MovimientoStock.usuarioId` y `Gasto.usuarioId`: si apuntan a un user no-admin que se borró, reasignar al primer admin clonado (mapa `userId → adminFallbackId`).
- `SolicitudVoluntario.decididaPorUserId` / `SolicitudVoluntarioTurno.decididaPorUserId`: si el user no se clonó, poner `null` (FK ya es `SetNull`).

**Fase 4 — Escritura en preprod** con `prismaPreprod`. Usar `createMany({ skipDuplicates: false })` por tabla en el mismo orden de dependencias. Para tablas grandes (AuditLog se omite, Turno/MovimientoStock pueden ser grandes) hacer chunks de 1000.

**Fase 5 — Auth secundario**: tras escribir users, generar `Account` solo para los admins clonados con `password = hash(<PASSWORD_PREPROD_FIJO>)` usando el mismo algoritmo que Better Auth usa en este proyecto. Verificar en [app/src/lib/](app/src/lib/) cómo Better Auth almacena la password (puede ser scrypt nativo de Better Auth) — si genera dudas, alternativa más simple: borrar `Account` por completo y dejar que el admin se loguee con flujo de password reset (requiere SMTP en preprod). **Decisión por defecto**: replicar el hash de Better Auth con un password único `preprod-{año}!` y documentarlo en el README del script.

**Fase 6 — Asserts post-refresh** (abortan con exit code 1 si fallan):
- `User.count()` en preprod = nº admins clonados.
- `User.findMany()` → ningún email contiene un dominio "real" (heurística: lista negra de dominios comunes `gmail.com`, `hotmail.com`, `outlook.com`, `yahoo.es`, etc.) ni el dominio del usuario en producción si lo conocemos.
- `Empleado.findMany({ where: { OR: [{ dni: { not: null } }, { email: { contains: '@', not: { endsWith: '@preprod.local' } } }] } })` → 0.
- `SolicitudVoluntario.findMany({ where: { OR: [{ observaciones: { not: null } }, { motivoRechazo: { not: null } }] } })` → 0.
- `AuditLog.count()` = 0.
- `Session.count()` = 0, `Verification.count()` = 0.
- Conteos por tabla operativa (Caseta, Edicion, Turno, etc.) > 0 si en prod > 0.

**Fase 7 — Resumen**: imprimir tabla con `tabla | filas_prod | filas_preprod | acción` y mensaje final con el password de admin para login.

### 3. npm script en [app/package.json](app/package.json)

```json
"refresh:preprod": "tsx scripts/refresh-preprod.ts"
```

### 4. Documentación

Añadir sección al [CLAUDE.md](CLAUDE.md) raíz bajo "Comandos" o como nuevo apartado "Operación":
- Cómo configurar `.env.refresh`.
- Cómo ejecutar `npm run refresh:preprod`.
- Advertencia sobre nunca apuntar `DATABASE_URL_PREPROD` a prod.
- Password de admin generado para login en preprod.

## Ficheros afectados

- **Crear**: [app/scripts/refresh-preprod.ts](app/scripts/refresh-preprod.ts), [app/.env.refresh.example](app/.env.refresh.example).
- **Modificar**: [app/package.json](app/package.json) (deps + script), [.gitignore](.gitignore) si hace falta, [CLAUDE.md](CLAUDE.md).
- **Reutilizar (no modificar)**: lista de tablas a truncar de [app/src/test/db-reset.ts](app/src/test/db-reset.ts) (sirve de referencia).

## Verificación end-to-end

1. Crear `app/.env.refresh` apuntando ambas URLs a **preprod** primero (test seguro: clonarse a sí mismo es no-op aceptable). Confirmar que el assert anti-self-clone falla y aborta limpiamente.
2. Crear `app/.env.refresh` real (prod → preprod). Ejecutar `npm run refresh:preprod`. Confirmar manualmente cuando pida REFRESH.
3. Esperar resumen de fase 7. Verificar:
   - Conteo de admins razonable (1-3).
   - Conteo de empleados/turnos/cierres > 0 si prod los tiene.
   - 0 en AuditLog/Session/Verification.
4. Login manual en `https://<preprod-url>/login` con email ofuscado del admin + password documentado.
5. Smoke test en preprod: navegar a `/admin/empleados` y verificar que los nombres son fakes españoles, no nombres reales. Idem `/admin/solicitudes`.
6. Spot-check SQL directo: `SELECT email FROM "user" LIMIT 5` y `SELECT nombre, email FROM "Empleado" LIMIT 5` desde Neon SQL editor — confirmar ofuscación.

## Riesgos y mitigaciones

- **Inversión prod/preprod**: doble guarda (URLs distintas + confirmación interactiva mostrando hosts).
- **Hash de Better Auth incompatible**: si replicar el hash falla, plan B es borrar `Account` completo y usar password reset por email (requiere SMTP en preprod). Decisión: probar fase 5 con un admin de prueba antes de hacer commit.
- **Volumetría**: `MovimientoStock` y `AuditLog` pueden ser grandes. AuditLog se borra; Movimientos se escriben en chunks.
- **Nuevas tablas en el futuro**: el script tiene una lista explícita de tablas/campos PII; al añadir nuevos modelos hay que actualizar el script. Documentarlo en el comentario del fichero.
