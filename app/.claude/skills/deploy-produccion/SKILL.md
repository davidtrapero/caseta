---
name: deploy-produccion
description: >
  Orquesta la subida a producción del proyecto caseta: valida el código (lint + build),
  comprueba y aplica migraciones de Prisma pendientes contra la BBDD de producción,
  sube la versión en package.json, hace commit de todo lo pendiente y empuja al remoto.
  Usar cuando el usuario diga "subir a producción", "deploy", "hacer el deploy", "subida a prod",
  "publicar", "lanzar a prod" o cualquier variante que exprese intención de publicar la versión
  actual. Invocar proactivamente ante estas frases — no esperar a que el usuario escriba el
  slash command. También disparar si el usuario dice "terminar el sprint" o "versión lista"
  en contexto de querer publicar.
---

# Deploy a producción

Orquesta lint → build → migraciones BBDD prod → bump versión → commit → push. Cada paso es un gate: si falla, se para y se reporta sin continuar.

## Paso 1 — Validaciones previas

Desde `app/`:

```bash
cd app && npm run lint
```

Si hay errores de lint, mostrar los errores y **parar**. No continuar hasta que estén resueltos.

```bash
NODE_EXTRA_CA_CERTS='C:\Users\dtrapero\all_certs_full.pem' npm run build
```

El prefijo `NODE_EXTRA_CA_CERTS` es obligatorio: el build puede hacer fetches externos (fuentes Google, etc.) y el proxy corporativo requiere ese certificado. Sin él, el build falla con error de TLS aunque el código sea correcto.

Si el build falla, mostrar los errores y **parar**.

## Paso 2 — Migraciones de BBDD pendientes (prod)

Antes de tocar `package.json` hay que asegurar que el schema de producción está alineado con las migraciones del repo. Si una versión nueva del código depende de columnas/tablas que aún no existen en prod, Vercel servirá errores en cuanto haga rebuild — por eso este gate va antes del commit, no después.

### 2.1 — Resolver `DATABASE_URL` de producción

La skill **nunca** asume que `DATABASE_URL` apunta a prod. Por defecto, `.env.local` tiene la URL del branch `dev` de Neon. Para apuntar a la rama principal hay dos vías aceptables, en este orden:

1. Variable de entorno `DATABASE_URL_PROD` exportada en la shell o en `.env.production.local` (gitignored).
2. Si no existe, **parar** y pedir al usuario que la proporcione una sola vez:

   > "No encuentro `DATABASE_URL_PROD`. Pásame la connection string del branch principal de Neon (la usaré solo para esta sesión, no la persisto)."

   Aceptar la URL en la respuesta y usarla inline en el comando — no escribirla en ningún fichero.

> ⚠️ Nunca sustituir el valor de `DATABASE_URL` en `.env.local` ni en `.env`. Si lo hicieras, el siguiente `npm run dev` apuntaría a producción sin saberlo. Pasar la URL de prod **solo** vía variable inline al comando concreto.

### 2.2 — Comprobar estado

Ejecutar `prisma migrate status` apuntando a prod:

```bash
DATABASE_URL="$DATABASE_URL_PROD" npx prisma migrate status
```

(En PowerShell: `$env:DATABASE_URL=$env:DATABASE_URL_PROD; npx prisma migrate status`. Bash de Windows acepta la sintaxis inline anterior.)

Tres resultados posibles:

- **"Database schema is up to date!"** → no hay nada que aplicar. Mencionarlo en una línea ("BBDD prod al día, sin migraciones pendientes") y saltar al Paso 3.
- **"Following migrations have not yet been applied: …"** → hay pendientes. Continuar en 2.3.
- **"Drift detected" / migraciones aplicadas que faltan en el repo / cualquier error de conexión** → **parar**. No intentar reparar drift desde aquí: es un caso fuera de scope para una subida rutinaria. Reportar el output literal y dejar que el usuario decida.

### 2.3 — Listar y confirmar las pendientes

Mostrar al usuario la lista textual de migraciones pendientes (los nombres de carpeta que devuelve `migrate status`) y pedir confirmación explícita antes de aplicarlas:

> "Voy a aplicar estas N migraciones contra prod: `<lista>`. Son cambios irreversibles en el schema. ¿Confirmas?"

No avanzar sin un sí. Si el usuario duda, sugerir abrir el SQL del último directorio pendiente con un `cat app/prisma/migrations/<nombre>/migration.sql` para revisión.

### 2.4 — Aplicar

Una vez confirmado:

```bash
DATABASE_URL="$DATABASE_URL_PROD" npx prisma migrate deploy
```

`migrate deploy` es el comando idempotente y no-interactivo de Prisma para entornos de despliegue: aplica solo las pendientes en orden, no genera archivos nuevos y no pide confirmación. Es lo opuesto a `migrate dev`, que sí genera archivos y nunca debe usarse contra prod.

Si `migrate deploy` falla a mitad de la lista (p. ej., una migración SQL choca con datos existentes), **parar inmediatamente**. Reportar:

- Qué migración rompió (nombre + error literal de Postgres).
- Qué migraciones se aplicaron antes de ese fallo (Prisma las habrá registrado en `_prisma_migrations`).
- No intentar rollback automático — un rollback de schema sin saber qué hay en `_prisma_migrations` es más peligroso que el fallo original. Pedir al usuario instrucciones.

Tras un `migrate deploy` exitoso, volver a ejecutar `migrate status` y confirmar que reporta "up to date" antes de seguir. Es barato y blinda contra estados intermedios.

## Paso 3 — Determinar el tipo de bump

Por defecto: **patch** (1.2.0 → 1.2.1).

Si el usuario especificó el tipo en su mensaje (`minor`, `major`), usar ese. En caso de duda, preguntar antes de continuar.

Calcular la nueva versión leyendo `version` de `app/package.json` y aplicando el bump semver manualmente (no usar `npm version` — ejecuta git tag automáticamente y eso no queremos aquí).

Ejemplo: `1.2.0` + patch → `1.2.1`.

## Paso 4 — Actualizar package.json

Editar solo el campo `"version"` en `app/package.json`. No tocar nada más del archivo.

## Paso 5 — Revisar qué se va a commitear

Ejecutar:

```bash
git status
git diff --stat
```

Mostrar al usuario el resumen de cambios pendientes (archivos modificados, añadidos, sin trackear) y la nueva versión que va a quedar en el commit.

**Pedir confirmación explícita** antes de continuar. Algo como:

> "Voy a commitear estos cambios como `chore(release): v1.2.1`. ¿Confirmas?"

No avanzar hasta obtener confirmación.

## Paso 6 — Commit

```bash
git add -A
git commit -m "chore(release): vX.Y.Z"
```

Donde `X.Y.Z` es la nueva versión. No incluir Co-Authored-By ni cuerpo adicional — el mensaje de release es autoexplicativo.

## Paso 7 — Push

```bash
git push
```

Confirmar que el push fue exitoso mostrando el output. Si falla (por ejemplo, el remoto tiene commits adelante), reportar el error y **no hacer force-push**: pedir al usuario que resuelva el conflicto.

## Qué NO hacer

- No ejecutar `npm version` (crea tags git automáticos que no queremos).
- No hacer force-push bajo ningún concepto.
- No saltarse la confirmación del paso 5 ni la del paso 2.3.
- No continuar si lint, build o `migrate status` tienen errores — la validación es la razón de ser del proceso.
- No modificar nada fuera de `app/package.json` en el bump de versión.
- No ejecutar `prisma migrate dev` contra prod (genera archivos y es interactivo). Para prod, **siempre** `migrate deploy`.
- No persistir la `DATABASE_URL` de prod en `.env.local`, `.env` ni en ningún archivo trackeado. Solo inline en el comando o en `.env.production.local` (gitignored).
- No intentar reparar drift de schema desde esta skill: si `migrate status` reporta drift, parar y delegar al usuario.
