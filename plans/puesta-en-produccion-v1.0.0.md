# Plan de despliegue — Caseta v1.0.0

Tag de release: `v1.0.0` sobre commit `613c973`.

## 1. Pre-flight checks (en local, sobre el tag `v1.0.0`)

Desde `app/`:

1. `git fetch --tags && git checkout v1.0.0` — trabajar exactamente sobre el commit `613c973`.
2. `npm ci` — instalación reproducible.
3. `npx prisma generate` — regenera el cliente Prisma.
4. `npm run lint` — debe pasar sin errores.
5. `npm run build` — verifica TS strict + prerender de Next 16.
6. `npm run test:back` (vitest) — sanity-check; los tests E2E (Playwright) requieren DB de test, opcional.
7. Verificar que `app/.env.local` NO está en el repo: `git ls-files app/.env.local` debe devolver vacío.
8. Verificar consistencia de migraciones: hay 5 migraciones en `app/prisma/migrations/` (`20260504090012_init` … `20260505120000_apuntarse_voluntarios`). Ejecutar `npx prisma migrate status` apuntando a la BD `dev` para confirmar que están todas aplicadas y que el schema está sincronizado (no hay drift). Si reporta drift, NO desplegar hasta resolverlo.
9. Confirmar entorno con proxy TLS: si aplica, exportar `NODE_EXTRA_CA_CERTS` antes de cualquier comando que llame a Neon o npm.
10. Auditar `process.env.*`: variables reales — `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` (sólo seed), `ENABLE_TEST_ENDPOINTS` (debe estar AUSENTE o `false` en prod).

## 2. Plataforma de hosting — DECIDIDO: Vercel (Hobby)

- Plan **Hobby (gratuito)** — uso no comercial, encaja con CLAUDE.md.
- Soporte oficial Next.js 16 App Router + Server Actions + middleware (`src/proxy.ts` se detecta como middleware estándar).
- HTTPS y dominio `*.vercel.app` gratis; dominio custom opcional.
- Build cero-config con `Root Directory: app`.
- Cold starts ~300ms aceptables para back-office de 2-5 usuarios.

## 3. Provisión de la base de datos productiva (Neon)

1. En la consola de Neon, identificar el proyecto. El branch `dev` es el de desarrollo.
2. Como BD de producción se usará el branch **`production`** ya existente en Neon.
3. Copiar la connection string del branch productivo (con `?sslmode=require`).
4. Aplicar migraciones contra prod **desde local, una sola vez**, exportando temporalmente la URL prod:
   - `DATABASE_URL="<URL prod>" npx prisma migrate deploy` (NO usar `migrate dev`).
5. **Adaptar el seed antes de ejecutar contra producción**: el seed actual crea Edición 2026, una caseta y 7 empleados demo. Decisión tomada: **sólo admin en prod**. Crear una variante (`prisma/seed.prod.ts` o flag `SEED_PROD_ONLY=true`) que únicamente cree el usuario admin a partir de `SEED_ADMIN_*`. Ejecutar después una sola vez:
   - `DATABASE_URL="<URL production>" SEED_ADMIN_EMAIL="<email>" SEED_ADMIN_PASSWORD="<password fuerte>" SEED_ADMIN_NAME="<nombre>" npx tsx prisma/seed.prod.ts`
6. Verificar conexión: `DATABASE_URL="<URL prod>" npx prisma migrate status` debe reportar todas las migraciones aplicadas.

## 4. Variables de entorno necesarias en producción

| Variable | Obligatoria | Notas |
|---|---|---|
| `DATABASE_URL` | Sí | URL del branch prod de Neon, con `sslmode=require`. |
| `BETTER_AUTH_SECRET` | Sí | 32 bytes random. Generar con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. **Distinto** del valor en dev. |
| `BETTER_AUTH_URL` | Sí | URL pública absoluta del deploy (ej. `https://caseta.midominio.com`). |
| `NEXT_PUBLIC_APP_URL` | Sí | Misma URL pública. **Build-time** — cambios requieren rebuild. |
| `NODE_ENV` | Auto | La plataforma la fija a `production`. |

**NO** deben estar en producción:

- `ENABLE_TEST_ENDPOINTS` — ausente o `≠ "true"`.
- `SEED_ADMIN_*` — sólo durante el seed manual, no en runtime.

## 5. Dominio y HTTPS

1. Comprar/asignar el dominio (ej. `caseta.midominio.com`).
2. En Vercel: Project → Settings → Domains → añadir el dominio → seguir las instrucciones DNS. HTTPS automático vía Let's Encrypt.
3. Tras propagación DNS, fijar `BETTER_AUTH_URL` y `NEXT_PUBLIC_APP_URL` con esa URL exacta y redeploy.
4. Verificar la cookie de sesión: tras login, debe aparecer en DevTools → Application → Cookies con flags `Secure` y `HttpOnly`, dominio igual al del deploy.

## 6. Deploy del tag v1.0.0

1. `git push origin v1.0.0`.
2. En Vercel: Import Project → conectar el repo → **Root Directory: `app`** (crítico, el código no está en la raíz).
3. Configurar variables de entorno (sección 4) en environment "Production".
4. Configurar deploy desde rama **`main`** (decidido). El tag `v1.0.0` queda como referencia inmutable de qué se desplegó. Asegurar que `main` apunta a `613c973` (commit del tag) en el momento del primer deploy.
5. Lanzar el primer deploy. Build esperado: `npm install` → `next build`.
6. Tras "Ready", visitar la URL custom y validar carga de `/login`.

## 7. Smoke tests post-deploy

- [ ] `GET /login` carga sin errores.
- [ ] Login del admin sembrado funciona; redirige a `/`.
- [ ] `GET /admin/casetas/nueva` permite crear una caseta.
- [ ] `GET /admin/ediciones/nueva` permite crear una edición y marcarla activa.
- [ ] `GET /admin/empleados/nuevo` permite crear empleado.
- [ ] `GET /admin/usuarios/nuevo` permite crear `gerente` y `cajero`; intentar acceder a `/admin/usuarios` como `gerente` debe denegar.
- [ ] `GET /turnos` y `/turnos/semana` cargan; crear un turno y asignar empleado.
- [ ] `GET /caja/cierres/nuevo` permite registrar un cierre del día.
- [ ] `GET /caja/gastos/nuevo` permite registrar un gasto.
- [ ] `GET /inventario/productos/nuevo`, `/inventario/pedidos/nuevo`, `/inventario/movimientos` operan.
- [ ] Formulario público: desde `/admin/solicitudes` obtener el token y abrir `/apuntarse/<token>` sin sesión. Enviar solicitud → ver `gracias`.
- [ ] Aprobar la solicitud desde `/admin/solicitudes`.
- [ ] `AuditLog` registra las creaciones (consulta directa a BD si no hay UI).
- [ ] `POST /api/test-reset` responde 404 en producción.

## 8. Plan de rollback

1. **Fallo aplicación (bug crítico)**: en Vercel, "Promote to Production" un deployment anterior, o crear tag `v1.0.1` revirtiendo `613c973`. No tocar BD.
2. **Fallo de migración o corrupción**:
   - Neon permite point-in-time recovery. Crear branch nuevo `prod-rollback-<fecha>` desde antes del deploy y repuntar `DATABASE_URL`.
   - Alternativa más segura: antes del deploy crear branch snapshot `prod-pre-v1.0.0`; si falla todo, repuntar ahí.
3. **Cookies rotas tras cambiar `BETTER_AUTH_SECRET`**: todos los usuarios deben re-loguear. No hay rollback de secret.

## 9. Deuda declarada

**Antes del deploy:**
- **Rotar credenciales de Neon** (declarado en CLAUDE.md). Generar password nueva del rol DB, actualizar `app/.env.local` y env var de Vercel.
- Crear el seed reducido para producción (sección 3.5).

**Inmediatamente después:**
- Cambiar la contraseña del admin sembrado desde la UI.
- Crear los usuarios reales (`gerente`, `cajero`).
- Configurar backups en Neon (validar retención del plan).
- Evaluar si `MANUAL_USUARIO.md` y otros `plans/*.md` untracked deben commitearse.
- Considerar `output: "standalone"` en `next.config.ts` si se valora self-host en el futuro.

## Decisiones cerradas

| # | Decisión | Valor |
|---|---|---|
| 1 | Plataforma | **Vercel Hobby** |
| 2 | Seed | **Sólo admin** — crear `seed.prod.ts` o flag para omitir demo |
| 3 | Branch Neon prod | **`production`** (ya existe) |
| 4 | Deploy desde | Rama **`main`** |
| 5 | Dominio + credenciales admin | A elegir en el momento de ejecutar (subdominio `*.vercel.app` por defecto) |
