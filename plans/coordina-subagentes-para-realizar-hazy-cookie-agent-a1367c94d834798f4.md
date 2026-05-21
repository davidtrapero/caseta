# Security Review — preprod PR

## Foundations verified (no findings)
- `requirePermiso` / `requireRole` correctly throw `AuthError`; admin bypass is hardcoded only in `requirePermiso`.
- `auth.ts` declares `rol`, `activo`, `debeCambiarPassword` with `input: false`.
- `proxy.ts` matcher excludes only the expected public routes; `apuntarse` covers both `/apuntarse/[token]` and `/apuntarse-empleado/[token]`.
- `test-seed-empleado-form/route.ts` is gated by `NODE_ENV !== production && ENABLE_TEST_ENDPOINTS === "true"` AND `x-test-secret` matching `BETTER_AUTH_SECRET`. Not exploitable.
- Public token endpoints (`apuntarse-empleado`, `apuntarse`) validate token (≥20 chars + `formularioToken` lookup), require `edicion.activa`, scope all turno lookups by `edicion.id`, rate-limit by IP, validate huecos and solapes.
- Password actions (`cambiarPasswordInicialAction`, `cambiarPasswordAction`) act on session user only; `resetearPasswordAction` requires `admin.usuarios.editar` (admin-only by default in the catalog).
- Email transport (`enviarEmail`) uses nodemailer with text-only body; subject/to are encoded by nodemailer, no header injection vector.
- CSV/XLSX export routes (`caja/cierres`, `caja/gastos`, `caja/nominas`, `turnos/asistencias`) all gate by `requirePermiso(...)` and scope by `edicionId`.
- Layout `/(app)/layout.tsx` enforces `debeCambiarPassword` server-side via `redirect("/cuenta/password-inicial")`. Header-based path detection (`x-pathname`/`next-url`) is a UX-bypass surface only; mutations remain protected by `requirePermiso`/`requireRole`.

## Findings

### 1. MEDIUM — Audit log forgery via client-supplied `userId` parameter
- File: `app/src/app/(app)/admin/solicitudes/actions.ts` line ~660 (`aprobarSolicitudEmpleadoAction`)
- The Server Action signature is `(_prev, formData, userId: string)` and uses `userId` for both `withAuditContext(userId, ...)` and `decididaPorUserId: userId` writes. The session is only consulted via `requirePermiso("solicitudes.decidir")`, but the audit/attribution `userId` is taken from the client-supplied third argument.
- Any user with `solicitudes.decidir` permission can spoof `userId` to attribute their action to a different user (including an admin) in `AuditLog`, `SolicitudEmpleado.decididaPorUserId`, and `SolicitudEmpleadoTurno.decididaPorUserId`.
- Confidence: ~85%. Next.js Server Actions are addressable by stable action ID for any authenticated user; the function reaches DB writes that record the spoofed identity.
- Recommendation: drop the third parameter and re-read the session inside the action, exactly like sibling actions `aprobarTurnosEmpleadoAction` / `rechazarTurnosEmpleadoAction` do (`const { user } = await requirePermiso(...)` and use `user.id`).

### 2. LOW — Decoupled `esVoluntario` flag from actual `tipoIds`
- Files: `app/src/app/(app)/empleados/schema.ts`, `app/src/app/(app)/empleados/actions.ts`
- Schema accepts `esVoluntario` from the client independently of `tipoIds`. `validarReglaVoluntario` validates the jornal/entidad rule against the client-supplied boolean, not against `tipoEmpleado.esVoluntario`. An attacker with `admin.empleados.crud` could mark an empleado contractually paid (`esVoluntario: false`) while linking only voluntary tipos.
- Impact: limited. Nominas key off `jornalDiario`, not `esVoluntario`, so financial exposure is not direct; the attacker already needs the CRUD permission and can already set `jornalDiario` legitimately. Mostly a data-integrity / taxonomy issue rather than privilege escalation.
- Confidence: <60% as a real exploit; reported as LOW for completeness, may be excluded from final markdown per the >80% threshold.
