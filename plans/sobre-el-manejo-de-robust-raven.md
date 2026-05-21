# Plan: Medidas de seguridad para datos sensibles en prod

## Contexto

La auditoría de seguridad detectó tres categorías de riesgo en el proyecto:

1. **Credenciales reales en archivos de entorno** — `.env.local` y `.env.test` contienen la URL de conexión a Neon con usuario `neondb_owner` y la `BETTER_AUTH_SECRET` en texto plano. El `.gitignore` los excluye correctamente, pero cualquier persona con acceso al sistema de archivos o a un backup puede leerlos. Además, `.env.test` usa la misma cuenta de BD que prod, lo que amplía innecesariamente la superficie de ataque.

2. **PII en texto plano** — `Empleado.dni`, `Empleado.telefono`, `Empleado.email`, y los campos equivalentes en `SolicitudVoluntario` y `SolicitudEmpleado` se almacenan sin cifrado en la BD. Si Neon sufre un breach o se filtra un dump, los datos personales quedan expuestos directamente.

3. **Datos financieros sin control adicional** — `Nomina.total`, `Nomina.jornalAplicado`, `Empleado.jornalDiario` son accesibles a cualquier usuario con acceso directo a la BD.

---

## Medidas recomendadas (por prioridad)

### 🔴 Prioridad 1 — Inmediata (esta semana)

#### 1.1 Rotar credenciales de Neon

> Ya declarado como deuda en `CLAUDE.md`. El `.env.test` hace que la misma credencial esté en dos archivos locales.

**Acciones:**
- En el dashboard de Neon, crear un nuevo rol de BD con permisos mínimos para la app (`SELECT`, `INSERT`, `UPDATE`, `DELETE` en las tablas necesarias — sin `DROP`, `ALTER`, `TRUNCATE`).
- Revocar o cambiar la contraseña del rol `neondb_owner` actual.
- Actualizar `DATABASE_URL` en Vercel (variables de entorno de producción) con la nueva credencial.
- Actualizar `.env.local` localmente.
- Para `.env.test`: crear un branch Neon dedicado a tests con rol separado, o usar una BD local (SQLite/Docker Postgres) para tests unitarios.

**Archivos afectados:** `.env.local`, `.env.test` (nunca commiteados).

#### 1.2 Rotar `BETTER_AUTH_SECRET`

Generar un nuevo secreto con `openssl rand -base64 32` y actualizarlo en Vercel y `.env.local`. Esto invalida todas las sesiones activas — avisar antes si hay usuarios logueados.

---

### 🟡 Prioridad 2 — Corto plazo (próximo sprint)

#### 2.1 Separar credenciales de tests de las de prod

`.env.test` tiene `DATABASE_URL` con `neondb_owner` (mismo usuario que prod, distinto endpoint). Opciones:

**Opción A (recomendada):** Neon branch de tests con rol limitado.
- Crear branch `test` en Neon desde el dashboard.
- Crear rol `app_test` con permisos solo de escritura en ese branch.
- Actualizar `.env.test` con la nueva URL.

**Opción B:** Tests contra Postgres local (Docker).
- `docker run -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:16`
- `DATABASE_URL=postgresql://postgres:test@localhost:5433/caseta_test`
- Requiere `prisma migrate deploy` en el setup de tests.

**Archivos afectados:** `.env.test`, posiblemente `package.json` (script de test con setup).

#### 2.2 Principio de mínimo privilegio en la BD

El rol `neondb_owner` tiene permisos de propietario (incluyendo `DROP TABLE`, `ALTER SCHEMA`). La app solo necesita DML.

- Crear rol `caseta_app` con `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public`.
- Usar ese rol en `DATABASE_URL` de la app (prod + dev).
- `neondb_owner` solo para migraciones Prisma (ejecutar `prisma migrate deploy` con esa credencial en CI, no en runtime).

---

### 🟢 Prioridad 3 — Medio plazo (GDPR / si los datos crecen)

#### 3.1 Cifrado de PII en la capa de aplicación

Campos afectados: `Empleado.dni`, `Empleado.telefono`, `Empleado.email`, `SolicitudVoluntario.nombre/telefono/email`, `SolicitudEmpleado.dni/telefono/email`.

**Enfoque recomendado para este stack:** cifrado simétrico AES-256-GCM en el Server Action, antes de escribir en BD.

```typescript
// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY!, "base64") // 32 bytes

export function encryptField(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString("base64")
}

export function decryptField(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64")
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const encrypted = buf.subarray(28)
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}
```

**Implicaciones:**
- Los campos cifrados no son buscables directamente (no `WHERE dni = ?`). Si hay búsquedas por DNI, necesitarías un hash de búsqueda separado (HMAC-SHA256 del DNI → campo `dniHash` para lookup, `dniCifrado` para mostrar).
- Requiere migración de datos existentes (script que lea, cifre y reescriba cada registro).
- Añadir `FIELD_ENCRYPTION_KEY` a Vercel y `.env.local`.

**Archivos a modificar si se implementa:**
- `app/src/lib/crypto.ts` (nuevo)
- `app/src/app/(app)/admin/empleados/actions.ts` — encriptar en escritura, desencriptar en lectura
- `app/src/app/apuntarse/[token]/actions.ts` — encriptar al crear solicitud
- `app/prisma/schema.prisma` — campos `String` sin cambio de tipo (el cifrado es transparente al schema)

> **Nota:** Para esta app de 2-5 usuarios con datos de empleados de feria, el cifrado de campos es una mejora significativa pero no crítica si se aplica el mínimo privilegio en BD (P2.2). Priorizar las medidas 1 y 2 primero.

---

## Verificación

| Medida | Cómo verificar |
|---|---|
| 1.1 Rotación Neon | `psql $NEW_URL -c "SELECT 1"` funciona; credencial antigua rechazada |
| 1.2 Rotación BETTER_AUTH_SECRET | Sesiones anteriores redirigen a `/login` (comportamiento esperado) |
| 2.1 Tests aislados | `npm test` pasa sin tocar la BD de prod/dev |
| 2.2 Mínimo privilegio | `DROP TABLE empleados` falla con el rol de la app; Prisma queries funcionan |
| 3.1 Cifrado PII | Campo `dni` en BD contiene base64 cifrado; UI muestra el valor en claro |

---

## Archivos críticos de referencia

- [app/prisma/schema.prisma](app/prisma/schema.prisma) — modelos con PII
- [app/src/lib/auth.ts](app/src/lib/auth.ts) — configuración Better Auth
- [app/src/lib/authz.ts](app/src/lib/authz.ts) — guards de rol
- [app/src/app/(app)/admin/empleados/actions.ts](app/src/app/(app)/admin/empleados/actions.ts) — mutaciones de empleados
- [app/src/app/apuntarse/[token]/actions.ts](app/src/app/apuntarse/[token]/actions.ts) — ingesta de solicitudes de voluntarios
