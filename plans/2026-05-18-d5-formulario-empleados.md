# D5.1–D5.11 — Formulario público empleados (análogo a voluntarios)

> **Para trabajadores agenticos:** SKILL REQUERIDA: Usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea a tarea. Las tareas usan sintaxis checkbox (`- [ ]`) para rastrear progreso.

**Objetivo:** Implementar un formulario público análogo al de voluntarios (`/apuntarse/[token]`) para empleados contratados, con búsqueda de DNI, autocompletado y validaciones de solapamiento.

**Arquitectura:** Formulario RSC que carga edición activa, componente client con búsqueda DNI onBlur y autocompletado, funciones de cálculo de huecos filtrando empleados no-voluntarios, actions con rate-limit y transacciones atómicas, integración en admin para aprobación.

**Stack:** Next.js 16 (App Router), React 19, Prisma 7, Zod 4, TypeScript 5 strict, Playwright E2E.

---

## Estructura de archivos

```
app/
├── prisma/
│   └── schema.prisma                    (modificar: agregar modelos SolicitudEmpleado)
├── src/
│   ├── app/
│   │   ├── apuntarse-empleado/          (nuevo directorio)
│   │   │   └── [token]/
│   │   │       ├── page.tsx              (RSC: carga edición, renderiza FormularioEmpleado)
│   │   │       ├── schema.ts             (Zod: validaciones formulario empleado)
│   │   │       ├── actions.ts            (buscarEmpleadoPorDniAction, crearSolicitudEmpleadoAction)
│   │   │       ├── gracias/
│   │   │       │   └── page.tsx          (confirmación post-solicitud)
│   │   │       ├── _components/
│   │   │       │   └── formulario-empleado.tsx  (client: form con onBlur DNI)
│   │   │       └── __tests__/
│   │   │           ├── buscar-empleado-action.spec.ts
│   │   │           ├── crear-solicitud-action.spec.ts
│   │   │           └── huecos-empleado.spec.ts
│   │   └── (app)/
│   │       ├── turnos/
│   │       │   └── _lib/
│   │       │       ├── huecos.ts         (modificar: agregar calcularHuecosEmpleado)
│   │       │       └── huecos-empleado.ts  (nuevo: función dedicated para empleados)
│   │       └── admin/
│   │           └── solicitudes/
│   │               ├── page.tsx          (modificar: agregar tab Empleados)
│   │               ├── actions.ts        (modificar: agregar aprobarSolicitudEmpleadoAction)
│   │               └── __tests__/
│   │                   └── aprobar-solicitud-empleado.spec.ts
│   └── lib/
│       └── rate-limit.ts                (sin cambios, solo usar buckets nuevos)
└── e2e/
    └── apuntarse-empleado.spec.ts       (test E2E: flujo completo)
```

---

## Task 1: Migración Prisma — Agregar modelos SolicitudEmpleado

**Archivos:**
- Modificar: `app/prisma/schema.prisma`
- Crear: `app/prisma/migrations/<timestamp>_add_solicitud_empleado` (generada automáticamente por Prisma)

### Paso 1: Entender el modelo actual SolicitudVoluntario

Lee líneas 434–487 de `schema.prisma` para comprender estructura (Edicion, EntidadVoluntario, estados, turnos).

### Paso 2: Agregar modelos SolicitudEmpleado al schema

Abre `app/prisma/schema.prisma` y localiza la sección de `SolicitudVoluntario` (línea ~434). Justo después de `SolicitudVoluntarioTurno`, inserta:

```prisma
// Solicitud de apuntarse como empleado (contratado).
// dni es UNIQUE per (edicionId, dni) para permitir re-solicitudes en años distintos.
model SolicitudEmpleado {
  id           String   @id @default(cuid())
  edicionId    String
  dni          String   // extraído de búsqueda en Empleado o ingresado manualmente
  nombre       String
  apellidos    String?
  telefono     String?
  email        String?
  estado       EstadoSolicitud @default(pendiente)
  motivoRechazo String?  @db.Text
  createdAt    DateTime @default(now())
  decididaAt   DateTime?
  decididaPorUserId String?

  edicion     Edicion                  @relation(fields: [edicionId], references: [id], onDelete: Cascade)
  decididaPor User?                    @relation("SolicitudEmpleadoDecididas", fields: [decididaPorUserId], references: [id], onDelete: SetNull)
  turnos      SolicitudEmpleadoTurno[]

  @@unique([edicionId, dni])
  @@index([edicionId, estado])
  @@index([dni])
}

model SolicitudEmpleadoTurno {
  id          String @id @default(cuid())
  solicitudId String
  turnoId     String

  estado            EstadoSolicitudTurno @default(pendiente)
  motivoRechazo     String?              @db.Text
  decididaAt        DateTime?
  decididaPorUserId String?

  solicitud   SolicitudEmpleado @relation(fields: [solicitudId], references: [id], onDelete: Cascade)
  turno       Turno             @relation(fields: [turnoId], references: [id], onDelete: Cascade)
  decididaPor User?             @relation("SolicitudEmpleadoTurnoDecididas", fields: [decididaPorUserId], references: [id], onDelete: SetNull)

  @@unique([solicitudId, turnoId])
  @@index([turnoId])
}
```

Además, actualiza modelo `Turno` para agregar relación a `SolicitudEmpleadoTurno`:

```prisma
model Turno {
  // ... campos existentes ...
  solicitudesVoluntario  SolicitudVoluntarioTurno[]
  solicitudesEmpleado    SolicitudEmpleadoTurno[]    // línea nueva

  // ... índices existentes ...
}
```

Actualiza modelo `User` para agregar relaciones a decisiones de empleados:

```prisma
model User {
  // ... campos existentes ...
  solicitudesEmpleadoDecididas      SolicitudEmpleado[] @relation("SolicitudEmpleadoDecididas")
  solicitudesEmpleadoTurnoDecididas SolicitudEmpleadoTurno[] @relation("SolicitudEmpleadoTurnoDecididas")
  // ... resto ...
}
```

### Paso 3: Crear y aplicar migración

Desde directorio `app/`:

```bash
npx prisma migrate dev --name "add SolicitudEmpleado models"
```

Esperado:
- Pregunta "¿Aplicar migración?" → responde "y"
- Genera archivo en `app/prisma/migrations/<timestamp>_add_solicitud_empleado/migration.sql`
- Regenera `node_modules/.prisma/client` automáticamente

### Paso 4: Verificar cliente Prisma regenerado

```bash
npx prisma generate
```

Esperado: Sin errores, tipos generados para `SolicitudEmpleado` y `SolicitudEmpleadoTurno`.

### Paso 5: Commit

```bash
cd app
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add SolicitudEmpleado models for employee signup form"
```

---

## Task 2: Función calcularHuecosEmpleado — Análogo a voluntarios

**Archivos:**
- Crear: `app/src/app/(app)/turnos/_lib/huecos-empleado.ts`
- Crear: `app/src/app/(app)/turnos/_lib/huecos-empleado.spec.ts`

### Paso 1: Escribir test unitario fallido

Crea `app/src/app/(app)/turnos/_lib/huecos-empleado.spec.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { calcularHuecosEmpleado } from "./huecos-empleado";

describe("calcularHuecosEmpleado", () => {
  let edicionId: string;
  let turnoId: string;
  let tipoEmpleadoId: string;

  beforeEach(async () => {
    // Seed: crear edición, turno, tipo empleado, plaza
    const edicion = await prisma.edicion.create({
      data: { anio: 2026, nombre: "Test", fechaInicio: new Date(), fechaFin: new Date(), activa: true },
    });
    edicionId = edicion.id;

    const caseta = await prisma.caseta.create({
      data: { nombre: "TestCaseta" },
    });

    const turno = await prisma.turno.create({
      data: {
        edicionId,
        casetaId: caseta.id,
        fechaInicio: new Date("2026-06-01T10:00:00Z"),
        fechaFin: new Date("2026-06-01T14:00:00Z"),
      },
    });
    turnoId = turno.id;

    const tipoEmpleado = await prisma.tipoEmpleado.create({
      data: {
        slug: "contratado",
        label: "Contratado",
        labelCorto: "CT",
        colorHex: "#0000FF",
        esVoluntario: false,
      },
    });
    tipoEmpleadoId = tipoEmpleado.id;

    await prisma.turnoPlaza.create({
      data: {
        turnoId,
        tipoEmpleadoId,
        cantidad: 2, // 2 huecos para contratados
      },
    });
  });

  it("debería retornar huecos libres (plazas - asignados - pendientes)", async () => {
    const huecos = await calcularHuecosEmpleado(prisma, edicionId);
    expect(huecos.get(turnoId)).toBe(2); // 2 - 0 - 0
  });

  it("debería descontar asignaciones existentes", async () => {
    // Crear empleado y asignación
    const empleado = await prisma.empleado.create({
      data: { nombre: "Test", esVoluntario: false, activo: true },
    });
    await prisma.turnoEmpleado.create({
      data: {
        turnoId,
        empleadoId: empleado.id,
        tipoImputadoId: tipoEmpleadoId,
      },
    });

    const huecos = await calcularHuecosEmpleado(prisma, edicionId);
    expect(huecos.get(turnoId)).toBe(1); // 2 - 1 - 0
  });

  it("debería descontar solicitudes empleado pendientes", async () => {
    // Crear solicitud empleado
    const solicitud = await prisma.solicitudEmpleado.create({
      data: {
        edicionId,
        dni: "12345678X",
        nombre: "Test",
        estado: "pendiente",
      },
    });
    await prisma.solicitudEmpleadoTurno.create({
      data: {
        solicitudId: solicitud.id,
        turnoId,
      },
    });

    const huecos = await calcularHuecosEmpleado(prisma, edicionId);
    expect(huecos.get(turnoId)).toBe(1); // 2 - 0 - 1
  });

  it("debería permitir excluir una solicitud (para aprobaciones)", async () => {
    const solicitud = await prisma.solicitudEmpleado.create({
      data: {
        edicionId,
        dni: "12345678X",
        nombre: "Test",
        estado: "pendiente",
      },
    });
    await prisma.solicitudEmpleadoTurno.create({
      data: {
        solicitudId: solicitud.id,
        turnoId,
      },
    });

    const huecos = await calcularHuecosEmpleado(prisma, edicionId, {
      excluirSolicitudId: solicitud.id,
    });
    expect(huecos.get(turnoId)).toBe(2); // 2 - 0 - 0 (solicitud excluida)
  });
});
```

Ejecuta test:

```bash
npm test -- huecos-empleado.spec.ts
```

Esperado: FAIL (función no existe aún).

### Paso 2: Implementar función

Crea `app/src/app/(app)/turnos/_lib/huecos-empleado.ts`:

```typescript
import "server-only";
import { prisma } from "@/lib/prisma";

type Tx = Parameters<Parameters<(typeof prisma)["$transaction"]>[0]>[0];

/**
 * Devuelve un Map<turnoId, huecosLibres> para empleados contratados en una edición.
 * Hueco libre = TurnoPlaza(contratado).cantidad
 *             - TurnoEmpleado(contratado asignado)
 *             - SolicitudEmpleadoTurno(pendiente)
 *
 * Si opts.turnoIds se pasa, solo calcula para esos turnos (optimización).
 * Si opts.excluirSolicitudId se pasa, excluye esa solicitud del conteo de pendientes
 * (útil en aprobarSolicitudAction para que los huecos que reservaba sean los que consume).
 */
export async function calcularHuecosEmpleado(
  tx: Tx,
  edicionId: string,
  opts?: { turnoIds?: string[]; excluirSolicitudId?: string }
): Promise<Map<string, number>> {
  const filtroTurnos = opts?.turnoIds ? { id: { in: opts.turnoIds } } : {};

  // Resolver el (los) tipo(s) marcados como esVoluntario=false (empleados contratados).
  // En la práctica, solo hay uno, pero soportamos N por seguridad.
  const tiposEmpleado = await tx.tipoEmpleado.findMany({
    where: { esVoluntario: false },
    select: { id: true },
  });
  const tipoEmpleadoIds = tiposEmpleado.map((t) => t.id);

  if (tipoEmpleadoIds.length === 0) {
    return new Map();
  }

  const turnos = await tx.turno.findMany({
    where: { edicionId, ...filtroTurnos },
    select: {
      id: true,
      plazas: {
        where: { tipoEmpleadoId: { in: tipoEmpleadoIds } },
        select: { cantidad: true },
      },
      asignaciones: {
        where: { tipoImputadoId: { in: tipoEmpleadoIds } },
        select: { empleadoId: true },
      },
      solicitudesEmpleado: {
        where: {
          solicitud: {
            estado: "pendiente",
            ...(opts?.excluirSolicitudId
              ? { id: { not: opts.excluirSolicitudId } }
              : {}),
          },
        },
        select: { solicitudId: true },
      },
    },
  });

  const result = new Map<string, number>();
  for (const t of turnos) {
    const plazas = t.plazas.reduce((acc, p) => acc + p.cantidad, 0);
    const asignados = t.asignaciones.length;
    const pendientes = t.solicitudesEmpleado.length;
    result.set(t.id, Math.max(0, plazas - asignados - pendientes));
  }
  return result;
}
```

### Paso 3: Ejecutar tests

```bash
npm test -- huecos-empleado.spec.ts
```

Esperado: PASS (todos los casos).

### Paso 4: Commit

```bash
cd app
git add src/app/\(app\)/turnos/_lib/huecos-empleado.ts src/app/\(app\)/turnos/_lib/huecos-empleado.spec.ts
git commit -m "feat(turnos): calcularHuecosEmpleado para solicitudes empleados"
```

---

## Task 3: Schema Zod para formulario empleado

**Archivos:**
- Crear: `app/src/app/apuntarse-empleado/[token]/schema.ts`
- Crear: `app/src/app/apuntarse-empleado/[token]/schema.spec.ts` (test básico)

### Paso 1: Escribir test para schema

Crea `app/src/app/apuntarse-empleado/[token]/schema.spec.ts`:

```typescript
import { crearSolicitudEmpleadoSchema } from "./schema";

describe("crearSolicitudEmpleadoSchema", () => {
  it("debería validar DNI obligatorio", () => {
    const data = {
      dni: "12345678X",
      nombre: "Juan",
      apellidos: "García",
      turnos: ["turno1"],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).not.toThrow();
  });

  it("debería rechazar si falta DNI", () => {
    const data = {
      nombre: "Juan",
      apellidos: "García",
      turnos: ["turno1"],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).toThrow("DNI es obligatorio");
  });

  it("debería rechazar si nombre vacío", () => {
    const data = {
      dni: "12345678X",
      nombre: "",
      apellidos: "García",
      turnos: ["turno1"],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).toThrow();
  });

  it("debería aceptar email o telefono opcionales", () => {
    const data = {
      dni: "12345678X",
      nombre: "Juan",
      apellidos: "García",
      email: "juan@test.com",
      turnos: ["turno1"],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).not.toThrow();
  });

  it("debería rechazar turnos vacíos", () => {
    const data = {
      dni: "12345678X",
      nombre: "Juan",
      apellidos: "García",
      turnos: [],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).toThrow();
  });

  it("debería detectar turnos duplicados", () => {
    const data = {
      dni: "12345678X",
      nombre: "Juan",
      apellidos: "García",
      turnos: ["turno1", "turno1"],
    };
    expect(() => crearSolicitudEmpleadoSchema.parse(data)).toThrow("duplicados");
  });
});
```

Ejecuta:

```bash
npm test -- schema.spec.ts
```

Esperado: FAIL.

### Paso 2: Implementar schema

Crea `app/src/app/apuntarse-empleado/[token]/schema.ts`:

```typescript
import { z } from "zod";

const arrayDeIds = z
  .array(z.string().min(1))
  .min(1, "Selecciona al menos un turno")
  .max(20, "Máximo 20 turnos por solicitud")
  .refine(
    (a) => new Set(a).size === a.length,
    { message: "Hay turnos duplicados" }
  );

export const crearSolicitudEmpleadoSchema = z
  .object({
    dni: z
      .string()
      .trim()
      .min(1, "DNI es obligatorio")
      .max(20, "DNI inválido"),
    nombre: z
      .string()
      .trim()
      .min(1, "Completa el nombre")
      .max(120, "Máximo 120 caracteres"),
    apellidos: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().max(120).optional()
    ),
    telefono: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z
        .string()
        .trim()
        .regex(/^\+?[0-9 .\-]{6,20}$/, "Teléfono inválido")
        .optional()
    ),
    email: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().email("Email inválido").optional()
    ),
    turnoIds: z.preprocess((v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string") {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed : [v];
        } catch {
          return [v];
        }
      }
      return v;
    }, arrayDeIds),
  })
  .refine((d) => d.email || d.telefono, {
    message: "Indica al menos email o teléfono",
    path: ["email"],
  });

export type CrearSolicitudEmpleadoInput = z.infer<typeof crearSolicitudEmpleadoSchema>;
```

### Paso 3: Ejecutar tests

```bash
npm test -- schema.spec.ts
```

Esperado: PASS.

### Paso 4: Commit

```bash
cd app
git add src/app/apuntarse-empleado/\[token\]/schema.ts src/app/apuntarse-empleado/\[token\]/schema.spec.ts
git commit -m "feat(apuntarse-empleado): Zod schema para formulario empleado"
```

---

## Task 4: Server action buscarEmpleadoPorDniAction

**Archivos:**
- Modificar: `app/src/app/apuntarse-empleado/[token]/actions.ts` (crear)
- Crear: `app/src/app/apuntarse-empleado/[token]/__tests__/buscar-empleado-action.spec.ts`

### Paso 1: Escribir test

Crea `app/src/app/apuntarse-empleado/[token]/__tests__/buscar-empleado-action.spec.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { buscarEmpleadoPorDniAction } from "../actions";

describe("buscarEmpleadoPorDniAction", () => {
  beforeEach(async () => {
    // Seed: crear empleado contratado
    await prisma.empleado.create({
      data: {
        nombre: "Juan",
        dni: "12345678X",
        email: "juan@test.com",
        telefono: "612345678",
        esVoluntario: false,
        activo: true,
      },
    });
  });

  it("debería encontrar empleado por DNI", async () => {
    const formData = new FormData();
    formData.append("dni", "12345678X");

    const result = await buscarEmpleadoPorDniAction(formData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.encontrado).toBe(true);
      expect(result.data.datos?.nombre).toBe("Juan");
      expect(result.data.datos?.email).toBe("juan@test.com");
    }
  });

  it("debería retornar encontrado=false si DNI no existe", async () => {
    const formData = new FormData();
    formData.append("dni", "99999999Z");

    const result = await buscarEmpleadoPorDniAction(formData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.encontrado).toBe(false);
      expect(result.data.datos).toBeUndefined();
    }
  });

  it("debería retornar encontrado=false si empleado está inactivo", async () => {
    await prisma.empleado.update({
      where: { dni: "12345678X" },
      data: { activo: false },
    });

    const formData = new FormData();
    formData.append("dni", "12345678X");

    const result = await buscarEmpleadoPorDniAction(formData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.encontrado).toBe(false);
    }
  });

  it("debería retornar encontrado=false si es voluntario", async () => {
    await prisma.empleado.create({
      data: {
        nombre: "Voluntario",
        dni: "87654321Y",
        esVoluntario: true,
        activo: true,
      },
    });

    const formData = new FormData();
    formData.append("dni", "87654321Y");

    const result = await buscarEmpleadoPorDniAction(formData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.encontrado).toBe(false);
    }
  });

  it("debería responder de forma uniforme ante rate-limit", async () => {
    // Simular 21 llamadas rápidas desde la misma IP para disparar rate-limit
    const formData = new FormData();
    formData.append("dni", "12345678X");

    let lastResult;
    for (let i = 0; i < 21; i++) {
      lastResult = await buscarEmpleadoPorDniAction(formData);
    }

    // La llamada 21 debería ser rate-limitada, pero retornar uniforme (encontrado=false)
    expect(lastResult?.ok).toBe(true);
    if (lastResult?.ok) {
      expect(lastResult.data.encontrado).toBe(false); // no revela si fue rate-limit
    }
  });
});
```

Ejecuta:

```bash
npm test -- buscar-empleado-action.spec.ts
```

Esperado: FAIL.

### Paso 2: Implementar action

Crea/modifica `app/src/app/apuntarse-empleado/[token]/actions.ts`:

```typescript
"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/action-result";
import { formDataToObject } from "@/lib/forms";

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function buscarEmpleadoPorDniAction(
  formData: FormData
): Promise<ActionResult<{ encontrado: boolean; datos?: { nombre: string; apellidos?: string; email?: string; telefono?: string } }>> {
  try {
    const dni = formData.get("dni");
    if (typeof dni !== "string" || dni.trim().length === 0) {
      return {
        ok: false,
        error: "DNI requerido",
      };
    }

    const ip = await getClientIp();
    const rl = checkRateLimit(ip, "apuntarse-empleado-lookup", 20, 60_000);
    if (!rl.allowed) {
      // Respuesta uniforme: no revela que es rate-limitado
      return {
        ok: true,
        data: { encontrado: false },
      };
    }

    const empleado = await prisma.empleado.findUnique({
      where: { dni: dni.trim() },
      select: {
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        activo: true,
        esVoluntario: true,
      },
    });

    if (!empleado || !empleado.activo || empleado.esVoluntario) {
      // Respuesta uniforme
      return {
        ok: true,
        data: { encontrado: false },
      };
    }

    return {
      ok: true,
      data: {
        encontrado: true,
        datos: {
          nombre: empleado.nombre,
          apellidos: empleado.apellidos ?? undefined,
          email: empleado.email ?? undefined,
          telefono: empleado.telefono ?? undefined,
        },
      },
    };
  } catch (err) {
    console.error("[buscarEmpleadoPorDniAction]", err);
    // Respuesta uniforme ante error
    return {
      ok: true,
      data: { encontrado: false },
    };
  }
}
```

### Paso 3: Ejecutar tests

```bash
npm test -- buscar-empleado-action.spec.ts
```

Esperado: PASS.

### Paso 4: Commit

```bash
cd app
git add src/app/apuntarse-empleado/\[token\]/actions.ts src/app/apuntarse-empleado/\[token\]/__tests__/buscar-empleado-action.spec.ts
git commit -m "feat(apuntarse-empleado): buscarEmpleadoPorDniAction con rate-limit"
```

---

## Task 5: Server action crearSolicitudEmpleadoAction

**Archivos:**
- Modificar: `app/src/app/apuntarse-empleado/[token]/actions.ts`
- Crear: `app/src/app/apuntarse-empleado/[token]/__tests__/crear-solicitud-action.spec.ts`

### Paso 1: Escribir test

Crea `app/src/app/apuntarse-empleado/[token]/__tests__/crear-solicitud-action.spec.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { crearSolicitudEmpleadoAction } from "../actions";

describe("crearSolicitudEmpleadoAction", () => {
  let edicionId: string;
  let turnoId: string;
  let turnoId2: string;
  let tipoEmpleadoId: string;
  let token: string;

  beforeEach(async () => {
    // Seed
    const edicion = await prisma.edicion.create({
      data: {
        anio: 2026,
        nombre: "Test",
        fechaInicio: new Date(),
        fechaFin: new Date(),
        activa: true,
        formularioToken: "test-token-" + Math.random().toString(36).slice(2),
      },
    });
    edicionId = edicion.id;
    token = edicion.formularioToken!;

    const caseta = await prisma.caseta.create({
      data: { nombre: "TestCaseta" },
    });

    const tipoEmp = await prisma.tipoEmpleado.create({
      data: {
        slug: "contratado",
        label: "Contratado",
        labelCorto: "CT",
        colorHex: "#0000FF",
        esVoluntario: false,
      },
    });
    tipoEmpleadoId = tipoEmp.id;

    turnoId = (
      await prisma.turno.create({
        data: {
          edicionId,
          casetaId: caseta.id,
          fechaInicio: new Date("2026-06-01T10:00:00Z"),
          fechaFin: new Date("2026-06-01T14:00:00Z"),
        },
      })
    ).id;

    turnoId2 = (
      await prisma.turno.create({
        data: {
          edicionId,
          casetaId: caseta.id,
          fechaInicio: new Date("2026-06-01T15:00:00Z"),
          fechaFin: new Date("2026-06-01T18:00:00Z"),
        },
      })
    ).id;

    await prisma.turnoPlaza.create({
      data: { turnoId, tipoEmpleadoId, cantidad: 2 },
    });
    await prisma.turnoPlaza.create({
      data: { turnoId: turnoId2, tipoEmpleadoId, cantidad: 1 },
    });
  });

  it("debería crear solicitud con turnos válidos", async () => {
    const formData = new FormData();
    formData.append("_token", token);
    formData.append("dni", "12345678X");
    formData.append("nombre", "Juan");
    formData.append("apellidos", "García");
    formData.append("email", "juan@test.com");
    formData.append("turnoIds", JSON.stringify([turnoId, turnoId2]));

    const result = await crearSolicitudEmpleadoAction(null, formData);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBeDefined();

      const solicitud = await prisma.solicitudEmpleado.findUnique({
        where: { id: result.data.id },
        include: { turnos: true },
      });
      expect(solicitud?.dni).toBe("12345678X");
      expect(solicitud?.estado).toBe("pendiente");
      expect(solicitud?.turnos).toHaveLength(2);
    }
  });

  it("debería rechazar si edición está inactiva", async () => {
    await prisma.edicion.update({
      where: { id: edicionId },
      data: { activa: false },
    });

    const formData = new FormData();
    formData.append("_token", token);
    formData.append("dni", "12345678X");
    formData.append("nombre", "Juan");
    formData.append("turnoIds", JSON.stringify([turnoId]));

    const result = await crearSolicitudEmpleadoAction(null, formData);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("formulario");
  });

  it("debería rechazar si turno no tiene huecos", async () => {
    // Crear 2 asignaciones para llenar plaza (cantidad=2)
    const empleado1 = await prisma.empleado.create({
      data: { nombre: "E1", esVoluntario: false, activo: true },
    });
    const empleado2 = await prisma.empleado.create({
      data: { nombre: "E2", esVoluntario: false, activo: true },
    });

    await prisma.turnoEmpleado.create({
      data: { turnoId, empleadoId: empleado1.id, tipoImputadoId: tipoEmpleadoId },
    });
    await prisma.turnoEmpleado.create({
      data: { turnoId, empleadoId: empleado2.id, tipoImputadoId: tipoEmpleadoId },
    });

    const formData = new FormData();
    formData.append("_token", token);
    formData.append("dni", "12345678X");
    formData.append("nombre", "Juan");
    formData.append("turnoIds", JSON.stringify([turnoId]));

    const result = await crearSolicitudEmpleadoAction(null, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.turnoIds).toBeDefined();
  });

  it("debería rechazar si turnos se solapan", async () => {
    // Crear turno que se solapa
    const turnoSolapa = await prisma.turno.create({
      data: {
        edicionId,
        casetaId: (await prisma.caseta.findFirst())!.id,
        fechaInicio: new Date("2026-06-01T12:00:00Z"), // Solapa con turnoId (10:00-14:00)
        fechaFin: new Date("2026-06-01T16:00:00Z"),
      },
    });
    await prisma.turnoPlaza.create({
      data: { turnoId: turnoSolapa.id, tipoEmpleadoId, cantidad: 1 },
    });

    const formData = new FormData();
    formData.append("_token", token);
    formData.append("dni", "12345678X");
    formData.append("nombre", "Juan");
    formData.append("turnoIds", JSON.stringify([turnoId, turnoSolapa.id]));

    const result = await crearSolicitudEmpleadoAction(null, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.turnoIds).toBeDefined();
  });

  it("debería preservar valores en error", async () => {
    const formData = new FormData();
    formData.append("_token", "invalid-token");
    formData.append("dni", "12345678X");
    formData.append("nombre", "Juan");
    formData.append("turnoIds", JSON.stringify([turnoId]));

    const result = await crearSolicitudEmpleadoAction(null, formData);

    expect(result.ok).toBe(false);
    expect(result.values?.dni).toBe("12345678X");
    expect(result.values?.nombre).toBe("Juan");
  });

  it("debería respetar rate-limit 10/min", async () => {
    // Crear 11 solicitudes desde la misma IP (burlable en test, pero verifica el patrón)
    for (let i = 0; i < 11; i++) {
      const formData = new FormData();
      formData.append("_token", token);
      formData.append("dni", `dni${i}@test.com`);
      formData.append("nombre", "Test");
      formData.append("turnoIds", JSON.stringify([turnoId]));

      const result = await crearSolicitudEmpleadoAction(null, formData);
      if (i < 10) {
        expect(result.ok).toBe(true); // Primeras 10 permitidas
      } else {
        expect(result.ok).toBe(false); // 11ª rechazada por rate-limit
      }
    }
  });
});
```

Ejecuta:

```bash
npm test -- crear-solicitud-action.spec.ts
```

Esperado: FAIL.

### Paso 2: Implementar action

Modifica `app/src/app/apuntarse-empleado/[token]/actions.ts` para agregar:

```typescript
import { detectarSolape, type TurnoRango } from "@/lib/turnos-solape";
import { calcularHuecosEmpleado } from "@/app/(app)/turnos/_lib/huecos-empleado";
import { withAuditContext } from "@/lib/audit";
import { parseForm, toActionError } from "@/lib/action-result";
import { crearSolicitudEmpleadoSchema } from "./schema";

export async function crearSolicitudEmpleadoAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const values = formDataToObject(formData);

    const token = formData.get("_token");
    if (typeof token !== "string" || token.length < 20) {
      return { ok: false, error: "Enlace inválido.", values };
    }

    const ip = await getClientIp();
    const rl = checkRateLimit(ip, "apuntarse-empleado-crear", 10, 60_000);
    if (!rl.allowed) {
      return {
        ok: false,
        error: "Demasiadas solicitudes desde tu conexión. Espera un minuto e inténtalo de nuevo.",
        values,
      };
    }

    const data = parseForm(crearSolicitudEmpleadoSchema, formData);

    const solicitud = await withAuditContext("public:apuntarse-empleado", () =>
      prisma.$transaction(async (tx) => {
        const edicion = await tx.edicion.findUnique({
          where: { formularioToken: token },
          select: { id: true, activa: true },
        });
        if (!edicion || !edicion.activa) {
          throw new Error("El formulario ya no está disponible.");
        }

        const turnos = await tx.turno.findMany({
          where: { id: { in: data.turnoIds }, edicionId: edicion.id },
          select: {
            id: true,
            casetaId: true,
            fechaInicio: true,
            fechaFin: true,
          },
        });
        if (turnos.length !== data.turnoIds.length) {
          throw new Error("Alguno de los turnos elegidos ya no existe.");
        }

        // Validar solapamientos entre los turnos seleccionados
        const dniSinte = `dni:${data.dni}`;
        const existentes: TurnoRango[] = turnos.map((t) => ({
          id: t.id,
          empleadoId: dniSinte,
          casetaId: t.casetaId,
          fechaInicio: t.fechaInicio,
          fechaFin: t.fechaFin,
        }));
        for (let i = 0; i < turnos.length; i++) {
          const t = turnos[i]!;
          const otros = existentes.filter((_, j) => j !== i);
          const r = detectarSolape(otros, {
            empleadoId: dniSinte,
            fechaInicio: t.fechaInicio,
            fechaFin: t.fechaFin,
          });
          if (r.solapa) {
            const err = new Error(
              "Los turnos seleccionados se solapan entre sí. Revisa el horario."
            );
            (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
              turnoIds: ["Turnos solapados"],
            };
            throw err;
          }
        }

        // Validar huecos disponibles
        const huecos = await calcularHuecosEmpleado(tx, edicion.id, {
          turnoIds: data.turnoIds,
        });
        const sinHueco = data.turnoIds.filter((id) => (huecos.get(id) ?? 0) <= 0);
        if (sinHueco.length > 0) {
          const err = new Error(
            "Algunos turnos ya no tienen huecos disponibles. Refresca la página."
          );
          (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors = {
            turnoIds: [`Sin huecos: ${sinHueco.length} turno(s)`],
          };
          throw err;
        }

        return tx.solicitudEmpleado.create({
          data: {
            edicionId: edicion.id,
            dni: data.dni,
            nombre: data.nombre,
            apellidos: data.apellidos ?? null,
            telefono: data.telefono ?? null,
            email: data.email ?? null,
            turnos: {
              createMany: {
                data: data.turnoIds.map((turnoId) => ({ turnoId })),
              },
            },
          },
          select: { id: true },
        });
      })
    );

    return { ok: true, data: { id: solicitud.id } };
  } catch (err) {
    const values = formDataToObject(formData);
    const fieldErrors =
      err instanceof Error
        ? (err as Error & { fieldErrors?: Record<string, string[]> }).fieldErrors
        : undefined;
    if (fieldErrors) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Error",
        fieldErrors,
        values,
      };
    }
    return toActionError(err);
  }
}
```

### Paso 3: Ejecutar tests

```bash
npm test -- crear-solicitud-action.spec.ts
```

Esperado: PASS.

### Paso 4: Commit

```bash
cd app
git add src/app/apuntarse-empleado/\[token\]/actions.ts src/app/apuntarse-empleado/\[token\]/__tests__/crear-solicitud-action.spec.ts
git commit -m "feat(apuntarse-empleado): crearSolicitudEmpleadoAction con rate-limit y validaciones"
```

---

## Task 6: RSC página /apuntarse-empleado/[token]/page.tsx

**Archivos:**
- Crear: `app/src/app/apuntarse-empleado/[token]/page.tsx`

### Paso 1: Entender flujo

La RSC debe:
1. Recibir token de route param
2. Validar token (fetch edición)
3. Si edición inactiva → 404
4. Calcular huecos para empleados contratados
5. Agrupar turnos por día/caseta
6. Renderizar `<FormularioEmpleado>`

### Paso 2: Crear página

Crea `app/src/app/apuntarse-empleado/[token]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularHuecosEmpleado } from "@/app/(app)/turnos/_lib/huecos-empleado";
import {
  claveDiaTurno,
  formatDiaLargoTurno,
  formatRangoTurno,
} from "@/app/(app)/turnos/_lib/fechas";
import { FormularioEmpleado } from "./_components/formulario-empleado";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ApuntarseEmpleadoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 20) notFound();

  const edicion = await prisma.edicion.findUnique({
    where: { formularioToken: token },
    select: { id: true, activa: true, nombre: true, anio: true },
  });
  if (!edicion || !edicion.activa) notFound();

  const ahora = new Date();

  const [turnos, huecos] = await Promise.all([
    prisma.turno.findMany({
      where: {
        edicionId: edicion.id,
        fechaInicio: { gte: ahora },
        plazas: {
          some: {
            tipoEmpleado: { esVoluntario: false }, // Solo plazas para contratados
            cantidad: { gt: 0 },
          },
        },
      },
      select: {
        id: true,
        fechaInicio: true,
        fechaFin: true,
        caseta: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaInicio: "asc" },
    }),
    calcularHuecosEmpleado(prisma, edicion.id),
  ]);

  const turnosDisponibles = turnos.filter((t) => (huecos.get(t.id) ?? 0) > 0);

  const grupos = new Map<
    string,
    {
      fecha: Date;
      casetas: Map<
        string,
        { casetaNombre: string; turnos: typeof turnosDisponibles }
      >;
    }
  >();
  for (const t of turnosDisponibles) {
    const k = claveDiaTurno(t.fechaInicio);
    if (!grupos.has(k)) grupos.set(k, { fecha: t.fechaInicio, casetas: new Map() });
    const grupo = grupos.get(k)!;
    if (!grupo.casetas.has(t.caseta.id)) {
      grupo.casetas.set(t.caseta.id, {
        casetaNombre: t.caseta.nombre,
        turnos: [],
      });
    }
    grupo.casetas.get(t.caseta.id)!.turnos.push(t);
  }

  const dias = Array.from(grupos.entries()).map(([clave, grupo]) => ({
    clave,
    fecha: grupo.fecha,
    casetas: Array.from(grupo.casetas.values()),
  }));

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Apuntarse como empleado</h1>
          <p className="text-muted-foreground mt-1">
            {edicion.nombre} · {edicion.anio}
          </p>
        </header>

        {dias.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--surface-glass-border)] bg-[var(--surface-glass)] p-8 text-center">
            <p className="text-base">No hay turnos disponibles ahora mismo.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Vuelve a abrir el enlace cuando se publiquen nuevos turnos.
            </p>
          </div>
        ) : (
          <FormularioEmpleado
            token={token}
            dias={dias.map((d) => ({
              clave: d.clave,
              titulo: formatDiaLargoTurno(d.fecha),
              casetas: d.casetas.map((c) => ({
                nombre: c.casetaNombre,
                turnos: c.turnos.map((t) => ({
                  id: t.id,
                  rango: formatRangoTurno(t.fechaInicio, t.fechaFin),
                  huecos: huecos.get(t.id) ?? 0,
                })),
              })),
            }))}
          />
        )}
      </div>
    </main>
  );
}
```

### Paso 3: Verificar que compila

```bash
npm run build
```

Esperado: Sin errores de TypeScript.

### Paso 4: Commit

```bash
cd app
git add src/app/apuntarse-empleado/\[token\]/page.tsx
git commit -m "feat(apuntarse-empleado): RSC page con cálculo de huecos"
```

---

## Task 7: Página de gracias

**Archivos:**
- Crear: `app/src/app/apuntarse-empleado/[token]/gracias/page.tsx`

### Paso 1: Crear página simple

Crea `app/src/app/apuntarse-empleado/[token]/gracias/page.tsx`:

```typescript
export default function GraciasPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-semibold mb-3">¡Gracias por apuntarte!</h1>
        <p className="text-muted-foreground mb-4">
          Tu solicitud ha sido registrada. Nos pondremos en contacto para confirmar tu asignación.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Volver
        </a>
      </div>
    </main>
  );
}
```

### Paso 2: Commit

```bash
cd app
git add src/app/apuntarse-empleado/\[token\]/gracias/page.tsx
git commit -m "feat(apuntarse-empleado): página de confirmación"
```

---

## Task 8: Componente FormularioEmpleado (client)

**Archivos:**
- Crear: `app/src/app/apuntarse-empleado/[token]/_components/formulario-empleado.tsx`

### Paso 1: Implementar componente

Crea `app/src/app/apuntarse-empleado/[token]/_components/formulario-empleado.tsx`:

```typescript
"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { FieldError, FormError } from "@/app/(app)/admin/_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import { buscarEmpleadoPorDniAction, crearSolicitudEmpleadoAction } from "../actions";
import { cn } from "@/lib/utils";

type DiaTurnos = {
  clave: string;
  titulo: string;
  casetas: Array<{
    nombre: string;
    turnos: Array<{ id: string; rango: string; huecos: number }>;
  }>;
};

function HuecosBadge({ huecos }: { huecos: number }) {
  return (
    <span
      className={cn(
        "ml-auto text-xs px-1.5 py-0.5 rounded font-medium tabular-nums",
        huecos <= 2
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground"
      )}
    >
      {huecos} {huecos === 1 ? "hueco" : "huecos"}
    </span>
  );
}

export function FormularioEmpleado({
  token,
  dias,
}: {
  token: string;
  dias: DiaTurnos[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(async (prev, formData) => {
    const result = await crearSolicitudEmpleadoAction(prev, formData);
    if (result.ok) router.push(`/apuntarse-empleado/${token}/gracias`);
    return result;
  }, null);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  const [dni, setDni] = useState((state?.values?.dni as string) || "");
  const [buscando, setBuscando] = useState(false);
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<{
    nombre: string;
    apellidos?: string;
    email?: string;
    telefono?: string;
  } | null>(null);

  const [diaSeleccionado, setDiaSeleccionado] = useState("");
  const [casetaSeleccionada, setCasetaSeleccionada] = useState("");

  const casetasDisponibles = useMemo(
    () =>
      Array.from(
        new Map(
          dias.flatMap((d) => d.casetas).map((c) => [c.nombre, c])
        ).values()
      ),
    [dias]
  );

  const diasFiltrados = useMemo(() => {
    return dias
      .filter((d) => !diaSeleccionado || d.clave === diaSeleccionado)
      .map((d) => ({
        ...d,
        casetas: d.casetas.filter(
          (c) => !casetaSeleccionada || c.nombre === casetaSeleccionada
        ),
      }))
      .filter((d) => d.casetas.length > 0);
  }, [dias, diaSeleccionado, casetaSeleccionada]);

  const handleDniBlur = async () => {
    if (!dni.trim()) return;
    setBuscando(true);
    try {
      const formData = new FormData();
      formData.append("dni", dni);
      const result = await buscarEmpleadoPorDniAction(formData);
      if (result.ok && result.data.encontrado && result.data.datos) {
        setEmpleadoEncontrado(result.data.datos);
      } else {
        setEmpleadoEncontrado(null);
      }
    } catch (err) {
      console.error("Error al buscar empleado:", err);
      setEmpleadoEncontrado(null);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <form action={formAction} className="flex flex-col gap-6 animate-fade-in">
      {state && !state.ok ? <FormError message={state.error} /> : null}
      <input type="hidden" name="_token" value={token} />

      <section className="rounded-lg border bg-card p-5 flex flex-col gap-4">
        <h2 className="text-base font-semibold">🆔 Tu DNI y datos</h2>

        <div>
          <Label htmlFor="dni">DNI</Label>
          <Input
            id="dni"
            name="dni"
            required
            maxLength={20}
            placeholder="12345678X"
            value={dni}
            onChange={(e) => {
              setDni(e.target.value);
              setEmpleadoEncontrado(null);
            }}
            onBlur={handleDniBlur}
            disabled={buscando}
          />
          {buscando && <p className="text-xs text-muted-foreground mt-1">Buscando...</p>}
          {empleadoEncontrado && (
            <p className="text-xs text-green-600 mt-1">✓ Empleado encontrado</p>
          )}
          <FieldError messages={errors.dni} />
        </div>

        <div>
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            required
            maxLength={120}
            placeholder="Juan"
            defaultValue={
              (state?.values?.nombre as string) ||
              empleadoEncontrado?.nombre ||
              ""
            }
          />
          <FieldError messages={errors.nombre} />
        </div>

        <div>
          <Label htmlFor="apellidos">Apellidos</Label>
          <Input
            id="apellidos"
            name="apellidos"
            maxLength={120}
            placeholder="García López"
            defaultValue={
              (state?.values?.apellidos as string) ||
              empleadoEncontrado?.apellidos ||
              ""
            }
          />
          <FieldError messages={errors.apellidos} />
        </div>

        <p className="text-xs text-muted-foreground -mb-1">
          Indica al menos un medio de contacto (email o teléfono).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="telefono">
              Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              maxLength={20}
              placeholder="612 345 678"
              defaultValue={
                (state?.values?.telefono as string) ||
                empleadoEncontrado?.telefono ||
                ""
              }
            />
            <FieldError messages={errors.telefono} />
          </div>
          <div>
            <Label htmlFor="email">
              Email <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              maxLength={254}
              placeholder="juan@ejemplo.com"
              defaultValue={
                (state?.values?.email as string) || empleadoEncontrado?.email || ""
              }
            />
            <FieldError messages={errors.email} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">📅 Turnos disponibles</h2>
          <p className="text-sm text-muted-foreground">
            Marca los que quieras hacer. No deben solaparse entre sí.
          </p>
        </div>
        <FieldError messages={errors.turnoIds} />

        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="filtro-dia" className="text-xs text-muted-foreground">
              Día
            </Label>
            <select
              id="filtro-dia"
              value={diaSeleccionado}
              onChange={(e) => setDiaSeleccionado(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 outline-offset-2 outline-ring"
            >
              <option value="">Todos los días</option>
              {dias.map((d) => (
                <option key={d.clave} value={d.clave}>
                  {d.titulo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="filtro-caseta" className="text-xs text-muted-foreground">
              Caseta
            </Label>
            <select
              id="filtro-caseta"
              value={casetaSeleccionada}
              onChange={(e) => setCasetaSeleccionada(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 outline-offset-2 outline-ring"
            >
              <option value="">Todas las casetas</option>
              {casetasDisponibles.map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {diasFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay turnos para los filtros seleccionados.
            </p>
          ) : (
            diasFiltrados.map((dia) => (
              <div key={dia.clave}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {dia.titulo}
                </h3>
                <div className="flex flex-col gap-3">
                  {dia.casetas.map((caseta) => (
                    <fieldset key={caseta.nombre} className="rounded-md border p-3">
                      <legend className="px-1 text-sm font-medium">
                        {caseta.nombre}
                      </legend>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {caseta.turnos.map((t) => (
                          <label
                            key={t.id}
                            className="flex items-center gap-2 text-sm rounded px-2 py-1.5 hover:bg-accent/20 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              name="turnoIds"
                              value={t.id}
                              defaultChecked={(
                                state?.values?.turnoIds as string[]
                              )?.includes(t.id)}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span>{t.rango}</span>
                            <HuecosBadge huecos={t.huecos} />
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? (
            <span className="flex items-center gap-2">
              <Spinner size={14} />
              Enviando…
            </span>
          ) : (
            "Apuntarme"
          )}
        </Button>
      </div>
    </form>
  );
}
```

### Paso 2: Verificar que compila

```bash
npm run build
```

Esperado: Sin errores.

### Paso 3: Commit

```bash
cd app
git add src/app/apuntarse-empleado/\[token\]/_components/formulario-empleado.tsx
git commit -m "feat(apuntarse-empleado): componente FormularioEmpleado con búsqueda DNI onBlur"
```

---

## Task 9: Integrar tab Empleados en /admin/solicitudes

**Archivos:**
- Modificar: `app/src/app/(app)/admin/solicitudes/page.tsx`

### Paso 1: Entender estructura actual

Lee `app/src/app/(app)/admin/solicitudes/page.tsx` (líneas 1–100) para ver cómo renderiza voluntarios.

### Paso 2: Modificar página para agregar tab empleados

Busca la sección donde itera sobre `solicitudes` (voluntarios). Agrégale un tab y secc. empleados. La modificación es extensa; aquí va la estructura:

Cerca del final del JSX (después de renderizar voluntarios), inserta un tab selector:

```typescript
// Agregar estado para tab seleccionado
const [tabSeleccionada, setTabSeleccionada] = useState<"voluntarios" | "empleados">("voluntarios");

// Luego, en el JSX renderizado, envuelve las listas en un selector de tabs
<div className="mb-4 flex gap-2 border-b">
  <button
    onClick={() => setTabSeleccionada("voluntarios")}
    className={cn(
      "px-4 py-2 font-medium",
      tabSeleccionada === "voluntarios"
        ? "border-b-2 border-primary text-primary"
        : "text-muted-foreground"
    )}
  >
    Voluntarios
  </button>
  <button
    onClick={() => setTabSeleccionada("empleados")}
    className={cn(
      "px-4 py-2 font-medium",
      tabSeleccionada === "empleados"
        ? "border-b-2 border-primary text-primary"
        : "text-muted-foreground"
    )}
  >
    Empleados
  </button>
</div>

// Renderizar lista según tab
{tabSeleccionada === "voluntarios" && (
  // ... tabla de voluntarios existente
)}

{tabSeleccionada === "empleados" && (
  // ... tabla de empleados (nueva)
)}
```

Es una modificación compleja y desacoplada de las tareas de app-generation. Para mantener la modularidad, **sugerencia alternativa**: crea un componente client `<SeccionEmpleados>` análogo a cómo está estructurada la sección voluntarios, y úsalo desde el page.

Por brevedad aquí, la idea es:

```typescript
// En el page.tsx, después de cargar solicitudesVoluntario, también carga:
const solicitudesEmpleado = await prisma.solicitudEmpleado.findMany({
  where: {
    estado: estadoFiltro,
    ...(sp.edicionId ? { edicionId: sp.edicionId } : {}),
  },
  include: {
    edicion: { select: { anio: true, nombre: true } },
    turnos: {
      include: {
        turno: { include: { caseta: { select: { nombre: true } } } },
      },
      orderBy: { turno: { fechaInicio: "asc" } },
    },
  },
  orderBy: { createdAt: "desc" },
});

// Renderiza dos tablas (una para cada)
```

Por ahora, **marca esta tarea como pendiente de revisión manual** (requiere UI/UX decision sobre layout). La implementación está guiada pero requiere ajuste al estilo visual del proyecto.

### Paso 3: Commit (si procede)

```bash
cd app
git add src/app/\(app\)/admin/solicitudes/page.tsx
git commit -m "feat(admin): agregar tab empleados a solicitudes (WIP layout)"
```

---

## Task 10: Action aprobarSolicitudEmpleadoAction

**Archivos:**
- Crear: `app/src/app/(app)/admin/solicitudes/actions.ts` (nueva acción)
- Crear: `app/src/app/(app)/admin/solicitudes/__tests__/aprobar-solicitud-empleado.spec.ts`

### Paso 1: Escribir test

Crea `app/src/app/(app)/admin/solicitudes/__tests__/aprobar-solicitud-empleado.spec.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { aprobarSolicitudEmpleadoAction } from "../actions";

describe("aprobarSolicitudEmpleadoAction", () => {
  let edicionId: string;
  let turnoId: string;
  let tipoEmpleadoId: string;
  let solicitudId: string;
  let userId: string;

  beforeEach(async () => {
    const edicion = await prisma.edicion.create({
      data: { anio: 2026, nombre: "Test", fechaInicio: new Date(), fechaFin: new Date() },
    });
    edicionId = edicion.id;

    const caseta = await prisma.caseta.create({
      data: { nombre: "TestCaseta" },
    });

    const tipoEmp = await prisma.tipoEmpleado.create({
      data: {
        slug: "contratado",
        label: "Contratado",
        labelCorto: "CT",
        colorHex: "#0000FF",
        esVoluntario: false,
      },
    });
    tipoEmpleadoId = tipoEmp.id;

    turnoId = (
      await prisma.turno.create({
        data: {
          edicionId,
          casetaId: caseta.id,
          fechaInicio: new Date("2026-06-01T10:00:00Z"),
          fechaFin: new Date("2026-06-01T14:00:00Z"),
        },
      })
    ).id;

    await prisma.turnoPlaza.create({
      data: { turnoId, tipoEmpleadoId, cantidad: 1 },
    });

    const user = await prisma.user.create({
      data: { email: "admin@test.com", name: "Admin" },
    });
    userId = user.id;

    const solicitud = await prisma.solicitudEmpleado.create({
      data: {
        edicionId,
        dni: "12345678X",
        nombre: "Juan",
        apellidos: "García",
        email: "juan@test.com",
        estado: "pendiente",
        turnos: {
          createMany: {
            data: [{ turnoId }],
          },
        },
      },
    });
    solicitudId = solicitud.id;
  });

  it("debería aprobar solicitud y crear asignaciones", async () => {
    const formData = new FormData();
    formData.append("solicitudId", solicitudId);
    formData.append("aprobar", "true");

    const result = await aprobarSolicitudEmpleadoAction(null, formData, userId);

    expect(result.ok).toBe(true);

    const solicitud = await prisma.solicitudEmpleado.findUnique({
      where: { id: solicitudId },
      include: { turnos: true },
    });
    expect(solicitud?.estado).toBe("aprobada");

    const asignacion = await prisma.turnoEmpleado.findFirst({
      where: { turnoId },
    });
    expect(asignacion).toBeDefined();
    expect(asignacion?.tipoImputadoId).toBe(tipoEmpleadoId);
  });

  it("debería crear Empleado nuevo si DNI no existe", async () => {
    // Borrar empleado anterior (si existe)
    await prisma.empleado.deleteMany({
      where: { dni: "12345678X" },
    });

    const formData = new FormData();
    formData.append("solicitudId", solicitudId);
    formData.append("aprobar", "true");

    const result = await aprobarSolicitudEmpleadoAction(null, formData, userId);

    expect(result.ok).toBe(true);

    const empleado = await prisma.empleado.findUnique({
      where: { dni: "12345678X" },
    });
    expect(empleado).toBeDefined();
    expect(empleado?.nombre).toBe("Juan");
    expect(empleado?.esVoluntario).toBe(false);
    expect(empleado?.activo).toBe(true);
  });

  it("debería rechazar solicitud con motivo", async () => {
    const formData = new FormData();
    formData.append("solicitudId", solicitudId);
    formData.append("aprobar", "false");
    formData.append("motivoRechazo", "No disponibilidad");

    const result = await aprobarSolicitudEmpleadoAction(null, formData, userId);

    expect(result.ok).toBe(true);

    const solicitud = await prisma.solicitudEmpleado.findUnique({
      where: { id: solicitudId },
    });
    expect(solicitud?.estado).toBe("rechazada");
    expect(solicitud?.motivoRechazo).toBe("No disponibilidad");
  });
});
```

Ejecuta:

```bash
npm test -- aprobar-solicitud-empleado.spec.ts
```

Esperado: FAIL.

### Paso 2: Implementar action

Modifica/crea `app/src/app/(app)/admin/solicitudes/actions.ts` para agregar:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { withAuditContext } from "@/lib/audit";
import type { ActionResult } from "@/lib/action-result";
import { calcularHuecosEmpleado } from "@/app/(app)/turnos/_lib/huecos-empleado";
import { detectarSolape, type TurnoRango } from "@/lib/turnos-solape";

export async function aprobarSolicitudEmpleadoAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
  userId: string
): Promise<ActionResult<null>> {
  try {
    await requireRole(["admin", "gerente"]);

    const solicitudId = formData.get("solicitudId");
    const aprobar = formData.get("aprobar") === "true";
    const motivoRechazo = formData.get("motivoRechazo") as string | null;

    if (!solicitudId || typeof solicitudId !== "string") {
      return { ok: false, error: "Solicitud no válida" };
    }

    return await withAuditContext(userId, () =>
      prisma.$transaction(async (tx) => {
        const solicitud = await tx.solicitudEmpleado.findUnique({
          where: { id: solicitudId },
          include: {
            edicion: { select: { id: true } },
            turnos: {
              include: {
                turno: {
                  select: {
                    id: true,
                    casetaId: true,
                    fechaInicio: true,
                    fechaFin: true,
                  },
                },
              },
            },
          },
        });

        if (!solicitud) {
          throw new Error("Solicitud no encontrada");
        }

        if (!aprobar) {
          // Rechazar
          await tx.solicitudEmpleado.update({
            where: { id: solicitudId },
            data: {
              estado: "rechazada",
              motivoRechazo: motivoRechazo ?? null,
              decididaAt: new Date(),
              decididaPorUserId: userId,
            },
          });
          return null;
        }

        // Aprobar: buscar o crear Empleado
        let empleado = await tx.empleado.findUnique({
          where: { dni: solicitud.dni },
          select: { id: true, esVoluntario: true, activo: true },
        });

        if (!empleado) {
          // Crear empleado nuevo
          empleado = await tx.empleado.create({
            data: {
              nombre: solicitud.nombre,
              apellidos: solicitud.apellidos ?? undefined,
              dni: solicitud.dni,
              email: solicitud.email ?? undefined,
              telefono: solicitud.telefono ?? undefined,
              esVoluntario: false,
              activo: true,
            },
          });
        } else if (empleado.esVoluntario) {
          // No permitir convertir voluntario a contratado
          throw new Error("El DNI corresponde a un voluntario registrado");
        } else {
          // Actualizar datos del empleado existente
          await tx.empleado.update({
            where: { id: empleado.id },
            data: {
              nombre: solicitud.nombre,
              apellidos: solicitud.apellidos ?? undefined,
              email: solicitud.email ?? undefined,
              telefono: solicitud.telefono ?? undefined,
            },
          });
        }

        // Resolver tipo empleado para contratados
        const tipoContratado = await tx.tipoEmpleado.findFirst({
          where: { esVoluntario: false },
          select: { id: true },
        });

        if (!tipoContratado) {
          throw new Error("No hay tipo de empleado configurado para contratados");
        }

        // Crear asignaciones para turnos solicitados
        const turnos = solicitud.turnos.map((st) => st.turno);
        for (const turno of turnos) {
          // Validar que no hay solape con otros turnos del mismo empleado
          const otrosDelEmpleado = await tx.turnoEmpleado.findMany({
            where: { empleadoId: empleado.id },
            include: {
              turno: {
                select: {
                  casetaId: true,
                  fechaInicio: true,
                  fechaFin: true,
                },
              },
            },
          });

          const otrosRango: TurnoRango[] = otrosDelEmpleado.map((te) => ({
            id: te.turno.id,
            empleadoId: empleado.id,
            casetaId: te.turno.casetaId,
            fechaInicio: te.turno.fechaInicio,
            fechaFin: te.turno.fechaFin,
          }));

          const solapante = detectarSolape(otrosRango, {
            empleadoId: empleado.id,
            fechaInicio: turno.fechaInicio,
            fechaFin: turno.fechaFin,
          });

          if (solapante.solapa) {
            throw new Error(
              `Turno ${turno.id} se solapa con asignación existente del empleado`
            );
          }

          // Crear asignación
          await tx.turnoEmpleado.create({
            data: {
              turnoId: turno.id,
              empleadoId: empleado.id,
              tipoImputadoId: tipoContratado.id,
            },
          });
        }

        // Actualizar estado de solicitud
        await tx.solicitudEmpleado.update({
          where: { id: solicitudId },
          data: {
            estado: "aprobada",
            decididaAt: new Date(),
            decididaPorUserId: userId,
          },
        });

        // Actualizar estados de turnos a aprobado
        await tx.solicitudEmpleadoTurno.updateMany({
          where: { solicitudId },
          data: {
            estado: "aprobado",
            decididaAt: new Date(),
            decididaPorUserId: userId,
          },
        });

        return null;
      })
    );
  } catch (err) {
    console.error("[aprobarSolicitudEmpleadoAction]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
```

### Paso 3: Ejecutar tests

```bash
npm test -- aprobar-solicitud-empleado.spec.ts
```

Esperado: PASS.

### Paso 4: Commit

```bash
cd app
git add src/app/\(app\)/admin/solicitudes/actions.ts src/app/\(app\)/admin/solicitudes/__tests__/aprobar-solicitud-empleado.spec.ts
git commit -m "feat(admin): aprobarSolicitudEmpleadoAction con lógica de creación/actualización"
```

---

## Task 11: Test E2E — Flujo completo

**Archivos:**
- Crear: `app/e2e/apuntarse-empleado.spec.ts`

### Paso 1: Escribir test E2E

Crea `app/e2e/apuntarse-empleado.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { prisma } from "@/lib/prisma";

test.describe("Formulario público empleados", () => {
  let edicionId: string;
  let token: string;
  let turnoId: string;

  test.beforeAll(async () => {
    // Seed: crear edición, turno, etc.
    const edicion = await prisma.edicion.create({
      data: {
        anio: 2026,
        nombre: "Test E2E",
        fechaInicio: new Date(),
        fechaFin: new Date(),
        activa: true,
        formularioToken: `test-token-${Date.now()}`,
      },
    });
    edicionId = edicion.id;
    token = edicion.formularioToken!;

    const caseta = await prisma.caseta.create({
      data: { nombre: "TestCaseta" },
    });

    const tipoEmp = await prisma.tipoEmpleado.create({
      data: {
        slug: "contratado",
        label: "Contratado",
        labelCorto: "CT",
        colorHex: "#0000FF",
        esVoluntario: false,
      },
    });

    const turno = await prisma.turno.create({
      data: {
        edicionId,
        casetaId: caseta.id,
        fechaInicio: new Date("2026-06-01T10:00:00Z"),
        fechaFin: new Date("2026-06-01T14:00:00Z"),
      },
    });
    turnoId = turno.id;

    await prisma.turnoPlaza.create({
      data: {
        turnoId,
        tipoEmpleadoId: tipoEmp.id,
        cantidad: 2,
      },
    });

    // Crear empleado conocido para autocompletado
    await prisma.empleado.create({
      data: {
        nombre: "Juan",
        apellidos: "García",
        dni: "12345678X",
        email: "juan@test.com",
        telefono: "612345678",
        esVoluntario: false,
        activo: true,
      },
    });
  });

  test("debería cargar formulario y buscar DNI", async ({ page }) => {
    await page.goto(`/apuntarse-empleado/${token}`);

    // Verificar que está el formulario
    await expect(page.locator("h1")).toContainText("Apuntarse como empleado");

    // Buscar DNI
    const dniInput = page.locator("input[name='dni']");
    await dniInput.fill("12345678X");
    await dniInput.blur();

    // Esperar a que se complete la búsqueda
    await page.waitForTimeout(500);

    // Verificar que nombre se autorrellena
    const nombreInput = page.locator("input[name='nombre']");
    const nombreValue = await nombreInput.inputValue();
    expect(nombreValue).toBe("Juan");

    // Verificar que email se autorrellena
    const emailInput = page.locator("input[name='email']");
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe("juan@test.com");
  });

  test("debería enviar solicitud completa", async ({ page }) => {
    await page.goto(`/apuntarse-empleado/${token}`);

    // Llenar formulario
    await page.locator("input[name='dni']").fill("87654321Y");
    await page.locator("input[name='nombre']").fill("María");
    await page.locator("input[name='apellidos']").fill("López");
    await page.locator("input[name='email']").fill("maria@test.com");

    // Seleccionar turno
    await page.locator(`input[name='turnoIds'][value='${turnoId}']`).check();

    // Enviar
    await page.locator("button[type='submit']").click();

    // Verificar redirección a gracias
    await page.waitForURL(`**/gracias`);
    await expect(page.locator("h1")).toContainText("Gracias");
  });

  test("debería validar solapamientos", async ({ page }) => {
    // Crear turno que se solapa
    const caseta = await prisma.caseta.findFirst();
    const tipoEmp = await prisma.tipoEmpleado.findFirst({
      where: { esVoluntario: false },
    });

    const turnoSolapa = await prisma.turno.create({
      data: {
        edicionId,
        casetaId: caseta!.id,
        fechaInicio: new Date("2026-06-01T12:00:00Z"),
        fechaFin: new Date("2026-06-01T16:00:00Z"),
      },
    });

    await prisma.turnoPlaza.create({
      data: {
        turnoId: turnoSolapa.id,
        tipoEmpleadoId: tipoEmp!.id,
        cantidad: 1,
      },
    });

    await page.goto(`/apuntarse-empleado/${token}`);

    // Seleccionar dos turnos que se solapan
    await page.locator(`input[name='turnoIds'][value='${turnoId}']`).check();
    await page.locator(`input[name='turnoIds'][value='${turnoSolapa.id}']`).check();

    // Intentar enviar
    await page.locator("button[type='submit']").click();

    // Verificar que muestra error
    await expect(page.locator("text=solapan")).toBeVisible();
  });

  test.afterAll(async () => {
    // Limpiar
    await prisma.edicion.delete({ where: { id: edicionId } });
  });
});
```

### Paso 2: Ejecutar test

```bash
npm run test:e2e -- apuntarse-empleado.spec.ts
```

Esperado: PASS (3+ tests pasando).

### Paso 3: Commit

```bash
cd app
git add e2e/apuntarse-empleado.spec.ts
git commit -m "test(e2e): flujo completo formulario empleados"
```

---

## Verificación final

### Ejecutar todos los tests

```bash
npm test
npm run test:e2e
```

Esperado: > 95% de cobertura en rutas críticas, todos E2E pasando.

### Ejecutar lint + build

```bash
npm run lint
npm run build
```

Esperado: Sin errores.

### Listar commits

```bash
git log --oneline | head -15
```

Esperado: 10–12 commits nuevos desde `main` (uno por task + squash opcional).

---

## Resumen de tareas completadas

| ID | Tarea | Status |
|---|---|---|
| D5.1 | Migración Prisma: SolicitudEmpleado | ✅ Commit |
| D5.2 | RSC `/apuntarse-empleado/[token]/page.tsx` | ✅ Commit |
| D5.3 | Función `calcularHuecosEmpleado` | ✅ Commit + Tests |
| D5.4 | Schema Zod | ✅ Commit + Tests |
| D5.5 | `buscarEmpleadoPorDniAction` | ✅ Commit + Tests |
| D5.6 | `crearSolicitudEmpleadoAction` | ✅ Commit + Tests |
| D5.7 | Componente `<FormularioEmpleado>` | ✅ Commit |
| D5.8 | Tab empleados en admin | ⚠️ WIP (layout a revisar) |
| D5.9 | `aprobarSolicitudEmpleadoAction` | ✅ Commit + Tests |
| D5.10 | Tests integración | ✅ Commit |
| D5.11 | Test E2E | ✅ Commit |

---

## Próximos pasos

Al terminar todas las tareas:

1. Crear rama `feature/d5-formulario-empleados` y pushear a remoto.
2. Invocar skill `close-development` para PR → Rancher scale-down → Jira READY TO PROD.
3. Integración en `migrate-log` si hay cambios arquitectónicos reseñables.

**Para ejecutar:** Usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` con checkpoints de revisión.
