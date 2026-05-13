# Catálogo de casos QA E2E

Casos de uso ejecutables por la skill [`qa-e2e`](../../app/.claude/skills/qa-e2e/SKILL.md) vía MCP Playwright. Cada fichero `<módulo>.md` contiene los casos de ese dominio.

## Convenciones

- **ID**: `CASO-<MÓDULO>-NNN` (zero-padded a 3 dígitos). Único en todo el catálogo.
- **Rol**: `admin` | `gerente` | `cajero` | `público` (sin login).
- **Precondición**: estado mínimo de la BD. Por defecto se asume el seed `seedMinimal()` tras `/api/test-reset`.
- **Pasos**: imperativos, ejecutables por un agente con MCP Playwright sin contexto adicional.
- **Aserciones**: comprobables vía `browser_snapshot` o navegación posterior. Evitar aserciones de timing.
- **Limpieza**: por defecto, cada caso resetea la BD vía `/api/test-reset` antes de empezar (lo hace el orquestador). No es necesario indicarlo en el caso salvo excepción.

## Estructura del seed mínimo

Tras `/api/test-reset` siempre hay:

- 1 edición activa (San Isidro 2026, 2026-05-01 → 2026-05-10).
- 1 caseta activa (`Caseta Test`).
- 1 proveedor activo (`Proveedor Test`).
- 3 usuarios: `admin@caseta.test`, `gerente@caseta.test`, `cajero@caseta.test`. Password: `test1234!`.
- Tipos de empleado seed: `vigilante`, `coordinador`, `trabajador`, `voluntario`, `ayudante`.

Los empleados, turnos, productos, cierres, etc. **no** están sembrados por defecto. Si un caso los necesita, créalos como parte de los pasos.

## Módulos

| Módulo | Fichero |
|---|---|
| Auth | [auth.md](auth.md) |
| Authorization (rol × ruta) | [authz.md](authz.md) |
| Turnos | [turnos.md](turnos.md) |
| Caja | [caja.md](caja.md) |
| Inventario | [inventario.md](inventario.md) |
| Voluntarios | [voluntarios.md](voluntarios.md) |
| Admin | [admin.md](admin.md) |

## Procedimientos compartidos

- [Login por rol](_shared/login.md)
- [Reset de BD entre casos](_shared/reset.md)

## Flujo de uso

1. La skill [`qa-e2e`](../../app/.claude/skills/qa-e2e/SKILL.md) lee este catálogo y despacha un subagente por módulo.
2. La skill [`qa-catalog-sync`](../../app/.claude/skills/qa-catalog-sync/SKILL.md) actualiza este catálogo cuando hay nuevos commits en `main`.

El SHA del último commit procesado por `qa-catalog-sync` se guarda en `.last-sync` (gitignored si conviene; aquí lo versionamos para coordinar entre máquinas).
