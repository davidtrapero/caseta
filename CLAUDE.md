# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repo is **pre-bootstrap**. The only file is [arquitectura-feria.md](arquitectura-feria.md), a planning document. No `package.json`, no source code, no database schema exists yet. Do not invent build/test commands — they will exist only after the stack is initialized.

## Project purpose

Private (non-commercial) web app to digitize the operation of food & drink stalls at a Spanish fair (*casetas de feria*). Three functional areas:

- **Shifts** (`turnos`): employee assignment per caseta, schedules, attendance.
- **Inventory** (`inventario`): products, stock, ins/outs.
- **Billing** (`facturación`): sales, tickets/invoices, cash summary.

Expected load: **2–5 concurrent users**. Do not optimize for high concurrency or add scaling abstractions.

## Chosen stack (decided — do not re-litigate)

**Next.js 14 (App Router) + Prisma + PostgreSQL + NextAuth + Tailwind + TypeScript.**

Rationale recorded in [arquitectura-feria.md](arquitectura-feria.md#opción-1--recomendada-nextjs--prisma--postgresql): single repo, single deploy, Server Actions over hand-written REST, and highest Claude Code training density for faster vibe-coding iterations. Spring Boot + Angular and Nuxt 3 were evaluated and rejected for this project.

**Hosting:** Railway (app + DB), optionally Supabase for the database.

## Architectural principles

- **Prisma schema is the source of truth.** Any data-model change starts in `schema.prisma`; types, queries, and migrations derive from it. Do not hand-edit generated types or bypass Prisma with raw SQL except for cases Prisma cannot express.
- **Server Actions over REST.** Use Next.js Server Actions for CRUD. Only introduce explicit API routes when something external (webhooks, third-party callbacks) needs them.
- **Auth is intentionally minimal.** Private app, closed user list via NextAuth. Do not build role hierarchies, invitation flows, or SSO unless explicitly requested.
- **Planned core entities:** `Caseta`, `Empleado`, `Turno`, `Producto`, `Factura`. Keep naming in Spanish to match the domain.

## Bootstrap (when starting the project)

1. `npx create-next-app@latest . --typescript --tailwind --app`
2. `npx prisma init` and define the schema for the entities above.
3. Configure `DATABASE_URL` against Supabase or Railway Postgres.
4. Connect GitHub repo to Railway for CI/CD.

Once bootstrapped, update this file with the real dev/build/lint/test commands.

## Working style expectations

- Development is **vibe coding**: expect functional descriptions per module (e.g. "pantalla de turnos con calendario semanal"). Ask for clarification on domain rules rather than guessing.
- Keep scope tight — this is a private tool; avoid premature abstractions, feature flags, or enterprise patterns.
- Comments and UI copy in **Spanish** to match the domain; code identifiers in English is acceptable but Spanish domain terms (`caseta`, `turno`, `factura`) should stay in Spanish.
