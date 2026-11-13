# Línea base de tests — `fix/auditoria-p0-dinero` sobre `origin/preprod` (d685a3f)

Fecha: 2026-10-23. BD de tests: Postgres local `caseta_test`, 16 migraciones.

Resultado: **127/127** en dos ejecuciones seguidas. En `origin/preprod` sin tocar eran 118/127.

## Qué se corrigió (solo tests, sin código de producción)

| Fallo | Arreglo |
|---|---|
| 4 aserciones de texto desfasadas (`turnos` ×2, `stock`, `aprobar-solicitud-empleado`) | Regex al mensaje actual |
| `huecos-empleado` ×4: buscaba slug `contratado`, que no existe | Busca por `esVoluntario: false`, como el código |
| `nominas` gerente: el catálogo no le da `caja.nominas.crear` | El test lo concede; el catálogo no cambia |
| `RolPermiso` sin sembrar y vaciado por `permissions.test.ts` | `beforeAll` global en `src/test/vitest-setup.ts` lo deja por defecto |

## Notas

- `dashboard.test.ts` falla en `afterAll` (FK `TurnoEmpleado_empleadoId_fkey`) si `caseta_test` conserva datos de ejecuciones previas. Se resolvió truncando la BD de tests; el test no limpia bien lo suyo.
- `resetDb` no trunca `RolPermiso` ni `TipoEmpleado`.
- `npm run lint` tiene avisos previos en ficheros sin tocar (`no-explicit-any`, `no-unused-vars`).
