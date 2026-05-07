---
name: deploy-produccion
description: >
  Orquesta la subida a producción del proyecto caseta: valida el código (lint + build),
  sube la versión en package.json, hace commit de todo lo pendiente y empuja al remoto.
  Usar cuando el usuario diga "subir a producción", "deploy", "hacer el deploy", "subida a prod",
  "publicar", "lanzar a prod" o cualquier variante que exprese intención de publicar la versión
  actual. Invocar proactivamente ante estas frases — no esperar a que el usuario escriba el
  slash command. También disparar si el usuario dice "terminar el sprint" o "versión lista"
  en contexto de querer publicar.
---

# Deploy a producción

Orquesta lint → build → bump versión → commit → push. Cada paso es un gate: si falla, se para y se reporta sin continuar.

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

## Paso 2 — Determinar el tipo de bump

Por defecto: **patch** (1.2.0 → 1.2.1).

Si el usuario especificó el tipo en su mensaje (`minor`, `major`), usar ese. En caso de duda, preguntar antes de continuar.

Calcular la nueva versión leyendo `version` de `app/package.json` y aplicando el bump semver manualmente (no usar `npm version` — ejecuta git tag automáticamente y eso no queremos aquí).

Ejemplo: `1.2.0` + patch → `1.2.1`.

## Paso 3 — Actualizar package.json

Editar solo el campo `"version"` en `app/package.json`. No tocar nada más del archivo.

## Paso 4 — Revisar qué se va a commitear

Ejecutar:

```bash
git status
git diff --stat
```

Mostrar al usuario el resumen de cambios pendientes (archivos modificados, añadidos, sin trackear) y la nueva versión que va a quedar en el commit.

**Pedir confirmación explícita** antes de continuar. Algo como:

> "Voy a commitear estos cambios como `chore(release): v1.2.1`. ¿Confirmas?"

No avanzar hasta obtener confirmación.

## Paso 5 — Commit

```bash
git add -A
git commit -m "chore(release): vX.Y.Z"
```

Donde `X.Y.Z` es la nueva versión. No incluir Co-Authored-By ni cuerpo adicional — el mensaje de release es autoexplicativo.

## Paso 6 — Push

```bash
git push
```

Confirmar que el push fue exitoso mostrando el output. Si falla (por ejemplo, el remoto tiene commits adelante), reportar el error y **no hacer force-push**: pedir al usuario que resuelva el conflicto.

## Qué NO hacer

- No ejecutar `npm version` (crea tags git automáticos que no queremos).
- No hacer force-push bajo ningún concepto.
- No saltarse la confirmación del paso 4.
- No continuar si lint o build tienen errores — la validación es la razón de ser del proceso.
- No modificar nada fuera de `app/package.json` en el bump de versión.
