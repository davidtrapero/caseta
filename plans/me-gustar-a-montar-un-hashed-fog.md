# Plan: Entorno de preproducción

## Context

Hoy la app vive solo en producción (Vercel + Neon branch principal). No hay un sitio donde validar migraciones, cambios de UI o flujos completos contra datos realistas antes de exponerlos a los usuarios reales de la feria. Montar **preprod** da:

- Validación de migraciones Prisma antes de tocar la BD de prod.
- Smoke test de releases (`chore(release): vX.Y.Z`) antes del push a `main`.
- Espacio para reproducir bugs con datos próximos a los reales sin riesgo.

Decisiones tomadas:
- **Vercel**: rama git `preprod` con Preview Deployment fijo, mismo proyecto.
- **BD**: branch Neon `preprod` ramificado de prod (snapshot de datos reales). URL ya creada por el usuario (pendiente de rotar password).
- **Dominio**: subdominio Vercel por defecto (`caseta-preprod-xxx.vercel.app`).
- **Acceso**: mismos usuarios que prod (vienen clonados con la BD).

## Pasos

### 1. Rotar credencial Neon de preprod

En Neon Console → branch `preprod` → Roles → `neondb_owner` → **Reset password**. Sustituir la URL pegada en chat. Guardar la nueva en gestor de secretos local; nunca commitear.

> Salda parte de la deuda declarada en CLAUDE.md ("Rotar credenciales Neon").

### 2. Crear rama git `preprod`

Desde [`c:\Proyectos\caseta`](c:\Proyectos\caseta):

```bash
git checkout -b preprod
git push -u origin preprod
```

Esta rama será **el espejo de lo que se está validando antes de mergear a `main`**. Flujo: feature → merge a `preprod` → smoke test → merge/fast-forward a `main` → release a prod.

### 3. Configurar Vercel para tratar `preprod` como Preview fijo

En el dashboard de Vercel del proyecto caseta:

- **Settings → Git → Production Branch**: dejar `main`.
- **Settings → Git → Preview Branches**: confirmar que Vercel despliega previews de todas las ramas (default) o limitar a `preprod` si quieres reducir builds.
- **Settings → Domains** (opcional): asignar un alias estable tipo `caseta-preprod.vercel.app` al último deploy de la rama `preprod` para tener URL fija (sin alias, cada commit cambia la URL).

### 4. Configurar Environment Variables en Vercel para `preprod`

En **Settings → Environment Variables**, crear cada variable con scope **Preview** y filtrada por **Branch: preprod** (Vercel permite scoping por rama desde 2024).

Variables necesarias (derivadas de [`app/.env.example`](app/.env.example) y del uso real en [`app/src/lib/prisma.ts:5`](app/src/lib/prisma.ts#L5), [`app/src/lib/auth-client.ts:6`](app/src/lib/auth-client.ts#L6), [`app/src/lib/auth.ts`](app/src/lib/auth.ts)):

| Variable | Valor preprod |
|---|---|
| `DATABASE_URL` | URL pooler del branch Neon `preprod` (la rotada en paso 1) |
| `BETTER_AUTH_SECRET` | **Nuevo secret** (`openssl rand -base64 32`), distinto al de prod |
| `BETTER_AUTH_URL` | URL pública del deploy preprod (p. ej. `https://caseta-preprod.vercel.app`) |
| `NEXT_PUBLIC_APP_URL` | Misma que `BETTER_AUTH_URL` |
| `ENABLE_TEST_ENDPOINTS` | **No definir** (mantener `/api/test-reset` apagado también en preprod) |

> Importante: `BETTER_AUTH_SECRET` distinto rota las sesiones entre entornos — un usuario logado en prod NO entra automáticamente en preprod, lo que evita confusiones.

### 5. Verificar `BETTER_AUTH_URL` y trustedOrigins

Revisar [`app/src/lib/auth.ts`](app/src/lib/auth.ts) para confirmar que la config de Better Auth lee `BETTER_AUTH_URL` y no tiene un `trustedOrigins` hardcoded que excluya el subdominio preprod. Si lo tiene, añadir el host de preprod a esa lista.

### 6. Primer deploy

```bash
git checkout preprod
git merge main          # arrancar preprod alineado con prod
git push                # dispara el primer build de preprod en Vercel
```

Vercel ejecutará automáticamente:
- `npm install` → `prisma generate` (postinstall hook en [`app/package.json:8`](app/package.json#L8)).
- `npm run build`.

Las migraciones Prisma **no se ejecutan en build**. Como el branch Neon preprod ya viene con el schema clonado de prod, no hace falta `migrate deploy` ahora. Para futuras migraciones que se prueben en preprod, ejecutar localmente apuntando a la URL preprod:

```bash
DATABASE_URL='<url-preprod-directa>' npx prisma migrate deploy
```

### 7. Smoke test post-deploy

En la URL pública de preprod:
- Login con un usuario admin existente (clonado de prod).
- Navegar dashboard, abrir un cierre, ver inventario, ver turnos.
- Crear un registro trivial (p. ej. un gasto de prueba) y borrarlo — confirma escritura en la BD preprod.
- Verificar en Neon Console que la actividad aparece en el branch `preprod`, no en el principal.

### 8. Documentar el flujo en `CLAUDE.md`

Añadir una sección breve en [`CLAUDE.md`](CLAUDE.md) describiendo el entorno preprod (rama, URL, branch Neon) y el flujo de release: feature → preprod → smoke test → main → skill `deploy-produccion`.

## Critical files

- [`app/.env.example`](app/.env.example) — referencia de variables.
- [`app/src/lib/auth.ts`](app/src/lib/auth.ts) — verificar `trustedOrigins`.
- [`app/src/lib/prisma.ts`](app/src/lib/prisma.ts) — consume `DATABASE_URL`.
- [`app/package.json`](app/package.json) — postinstall ya ejecuta `prisma generate`, no requiere cambios.
- [`CLAUDE.md`](CLAUDE.md) — documentar entorno nuevo al final.

## Verificación end-to-end

1. `git branch -a` muestra `preprod` local y `origin/preprod`.
2. Vercel dashboard muestra deployment **Ready** en la rama `preprod` con su URL.
3. La URL preprod responde y el login funciona con un usuario clonado.
4. En Neon Console, queries del último uso aparecen en el branch `preprod`, no en el principal.
5. `BETTER_AUTH_SECRET` de preprod ≠ prod (sesiones aisladas).
6. Tras un cambio trivial commiteado a `preprod` y empujado, Vercel dispara un nuevo build automáticamente.

## Out of scope

- Dominio propio (decidido: subdominio Vercel).
- Vercel Deployment Protection con password (decidido: acceso por usuarios clonados).
- Reset periódico de la BD preprod desde prod (manual cuando sea útil; recrear el branch en Neon en segundos).
- Tests E2E automatizados en preprod (deuda existente, no incluido aquí).
