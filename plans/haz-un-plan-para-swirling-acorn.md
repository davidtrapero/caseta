# Plan: backups automatizados de la BBDD de producción

## Context

La app caseta corre en Vercel con BBDD en Neon (PostgreSQL). Hoy **no existe ninguna estrategia de backup**: si alguien borra una edición, una nómina o trunca una tabla por error, la única red de seguridad es el PITR nativo de Neon (7-30 días según plan), pero no hay snapshots nombrados ni proceso documentado de restauración. Durante la temporada de feria (abril–septiembre) la app maneja datos operativos críticos —turnos, cierres de caja, nóminas— y un fallo no recuperable comprometería el negocio.

El objetivo es montar un sistema **simple, barato y auditable** de snapshots diarios usando branching de Neon (gratis, instantáneo) orquestado desde GitHub Actions. La estrategia pesa cero almacenamiento externo, no introduce dependencias nuevas en la app, y reutiliza la infra de CI ya existente (`migrate-preprod.yml`, secretos en GH Actions).

**Decisiones cerradas con el usuario:**
- Estrategia: **Neon PITR + branch nombrado `backup-YYYY-MM-DD` diario** vía Neon API.
- Frecuencia: cron diario, con **ventana configurable** (variables de repo `BACKUP_WINDOW_START` / `BACKUP_WINDOW_END` formato `MM-DD`) — fuera de ventana, skip.
- Retención: **30 días rolling + 1 mensual (día 01) preservado 12 meses**.

## Arquitectura

Un único workflow `.github/workflows/backup-prod.yml` con dos jobs encadenados:

1. **`snapshot`** — gating por ventana → comprobar idempotencia → crear branch en Neon.
2. **`prune`** — listar branches `backup-*` → borrar los > 30 días salvo los del día 01 con < 365 días.

Trigger doble: `schedule` (cron 02:15 UTC ≈ 04:15 Madrid) + `workflow_dispatch` con input `force` para probar fuera de ventana.

## Secretos y variables nuevas

| Tipo | Nombre | Valor | Origen |
|---|---|---|---|
| Secret | `NEON_API_KEY` | API key personal de Neon | https://console.neon.tech/app/settings/api-keys |
| Secret | `NEON_PROJECT_ID` | id del proyecto | URL de la consola Neon |
| Secret | `NEON_PROD_BRANCH_ID` | id del branch de prod | `GET /projects/{id}/branches` |
| Variable | `BACKUP_WINDOW_START` | `04-01` | configurable con `gh variable set` |
| Variable | `BACKUP_WINDOW_END` | `09-30` | configurable con `gh variable set` |

## Ficheros a crear

### 1. [.github/workflows/backup-prod.yml](.github/workflows/backup-prod.yml) (nuevo)

Estructura:

```yaml
name: backup-prod
on:
  schedule:
    - cron: '15 2 * * *'
  workflow_dispatch:
    inputs:
      force:
        description: 'Forzar backup ignorando ventana'
        type: boolean
        default: false

concurrency:
  group: backup-prod
  cancel-in-progress: false

jobs:
  snapshot:
    runs-on: ubuntu-latest
    outputs:
      run: ${{ steps.window.outputs.run }}
    steps:
      - id: window
        run: |
          TODAY=$(date -u +%m-%d)
          START="${{ vars.BACKUP_WINDOW_START }}"
          END="${{ vars.BACKUP_WINDOW_END }}"
          if [ "${{ inputs.force }}" = "true" ]; then
            echo "run=true" >> $GITHUB_OUTPUT; exit 0
          fi
          if [[ "$TODAY" > "$START" || "$TODAY" == "$START" ]] && \
             [[ "$TODAY" < "$END"   || "$TODAY" == "$END"   ]]; then
            echo "run=true"  >> $GITHUB_OUTPUT
          else
            echo "run=false" >> $GITHUB_OUTPUT
            echo "Fuera de ventana ($START..$END) — skip"
          fi

      - name: Crear branch backup
        if: steps.window.outputs.run == 'true'
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
          PROJECT:      ${{ secrets.NEON_PROJECT_ID }}
          PARENT:       ${{ secrets.NEON_PROD_BRANCH_ID }}
        run: |
          NAME="backup-$(date -u +%Y-%m-%d)"
          EXISTS=$(curl -fsS -H "Authorization: Bearer $NEON_API_KEY" \
            "https://console.neon.tech/api/v2/projects/$PROJECT/branches" \
            | jq -r --arg n "$NAME" '.branches[] | select(.name==$n) | .id')
          if [ -n "$EXISTS" ]; then
            echo "Idempotente: $NAME ya existe ($EXISTS)"; exit 0
          fi
          curl -fsS -X POST \
            -H "Authorization: Bearer $NEON_API_KEY" \
            -H "Content-Type: application/json" \
            "https://console.neon.tech/api/v2/projects/$PROJECT/branches" \
            -d "{\"branch\":{\"parent_id\":\"$PARENT\",\"name\":\"$NAME\"}}"

  prune:
    needs: snapshot
    if: needs.snapshot.outputs.run == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Borrar backups antiguos
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
          PROJECT:      ${{ secrets.NEON_PROJECT_ID }}
        run: |
          NOW=$(date -u +%s)
          curl -fsS -H "Authorization: Bearer $NEON_API_KEY" \
            "https://console.neon.tech/api/v2/projects/$PROJECT/branches" \
          | jq -r '.branches[] | select(.name|startswith("backup-")) | "\(.id) \(.name)"' \
          | while read ID NAME; do
              D=${NAME#backup-}
              TS=$(date -u -d "$D" +%s) || continue
              AGE=$(( (NOW - TS) / 86400 ))
              DD=${D##*-}
              # Día 01 → preservar 365 días
              if [ "$DD" = "01" ] && [ "$AGE" -lt 365 ]; then continue; fi
              if [ "$AGE" -gt 30 ]; then
                echo "Borrando $NAME (edad $AGE d)"
                curl -fsS -X DELETE \
                  -H "Authorization: Bearer $NEON_API_KEY" \
                  "https://console.neon.tech/api/v2/projects/$PROJECT/branches/$ID"
              fi
            done
```

**Endpoints Neon usados:**
- `GET    /api/v2/projects/{project_id}/branches` — listar.
- `POST   /api/v2/projects/{project_id}/branches` — crear (`parent_id` + `name`).
- `DELETE /api/v2/projects/{project_id}/branches/{branch_id}` — borrar.

### 2. [docs/backups.md](docs/backups.md) (nuevo)

Contenido mínimo:
- **Arquitectura**: diagrama de 3 cajas (cron → Neon API → branches con prefijo `backup-`).
- **Configurar ventana**: `gh variable set BACKUP_WINDOW_START --body 04-01 --repo <owner>/caseta`.
- **Disparar manualmente**: `gh workflow run backup-prod.yml -f force=true`.
- **Restaurar**:
  1. Consola Neon → branch `backup-YYYY-MM-DD` → "Connection string".
  2. Para inspección: `DATABASE_URL=<string-del-branch> npx prisma studio` desde [`app/`](app/).
  3. Para volcar a un fichero: `pg_dump <connection-string> > restore.sql`.
  4. **Nunca** apuntar la app prod directamente a un branch de backup — usarlo como fuente de lectura/dump.
- **Tabla de retención**: 30 días rolling + 1 mensual / 12 meses.
- **Runbook incidencias**: qué hacer si el workflow falla (revisar logs, comprobar `NEON_API_KEY` vigente, lanzar manual con `force`).

### 3. [CLAUDE.md](CLAUDE.md) (editar)

Añadir bullet en la sección "Deuda declarada" o crear sección "Backups":

```md
## Backups

Workflow `.github/workflows/backup-prod.yml` crea snapshot diario como branch Neon `backup-YYYY-MM-DD` durante la ventana configurable (`BACKUP_WINDOW_START`/`END`, default abr–sep). Retención 30 días + mensuales 12 meses. Documentación y runbook de restauración en [docs/backups.md](docs/backups.md).
```

## Verificación end-to-end

1. **Setup**: registrar los 3 secrets + 2 variables (`gh secret set` / `gh variable set`).
2. **Smoke test**: `gh workflow run backup-prod.yml -f force=true` → comprobar en consola Neon que aparece `backup-YYYY-MM-DD` con tamaño igual al branch padre.
3. **Idempotencia**: relanzar el mismo día → log debe decir `Idempotente: ... ya existe`, sin error.
4. **Prune**: crear manualmente vía API un branch `backup-2024-01-15` (edad > 30d, día ≠ 01), relanzar workflow, verificar que se borra. Crear `backup-2025-08-01` (día 01, edad < 365), verificar que **no** se borra.
5. **Restauración**: seguir runbook en `docs/backups.md` con un branch de backup → abrir Prisma Studio y validar que se ven los datos del día.
6. **Gating de ventana**: poner `BACKUP_WINDOW_END=01-01`, lanzar sin `force`, log debe decir "Fuera de ventana — skip".

## Out of scope (explícito)

- pg_dump a S3/R2/Release: descartado, depende solo de Neon.
- Backups durante deploy: descartado, el cron diario cubre el RPO objetivo.
- Notificaciones Slack/email en fallo: se puede añadir más tarde con `if: failure()` y un step de webhook.
- Rotar credenciales Neon (deuda pre-existente declarada en CLAUDE.md): tarea independiente.
