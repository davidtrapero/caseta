// Endpoint exclusivo de tests: siembra datos para el formulario de empleados.
// Establece formularioToken en la edición activa, crea turnos futuros con plazas
// de empleado (no voluntario), y crea un empleado de búsqueda por DNI.
// Protegido por la misma guardia que /api/test-reset.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.BETTER_AUTH_SECRET ?? "";

export async function POST(req: Request) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_TEST_ENDPOINTS !== "true"
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const header = req.headers.get("x-test-secret");
  if (!header || header !== SECRET) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Buscar la edición activa (creada por seedMinimal en test-reset)
  const edicion = await prisma.edicion.findFirst({
    where: { activa: true },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (!edicion) {
    return NextResponse.json({ ok: false, error: "No hay edición activa" }, { status: 400 });
  }

  // Generar formularioToken único (≥ 20 chars) — sin depender de node:crypto
  const formularioToken = `e2e-token-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await prisma.edicion.update({
    where: { id: edicion.id },
    data: { formularioToken },
  });

  // Buscar caseta (creada por seedMinimal)
  const caseta = await prisma.caseta.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!caseta) {
    return NextResponse.json({ ok: false, error: "No hay caseta" }, { status: 400 });
  }

  // Buscar tipoEmpleado no voluntario
  const tipoEmpleado = await prisma.tipoEmpleado.findFirst({
    where: { esVoluntario: false, activo: true },
    select: { id: true },
    orderBy: { orden: "asc" },
  });
  if (!tipoEmpleado) {
    return NextResponse.json({ ok: false, error: "No hay TipoEmpleado no-voluntario" }, { status: 400 });
  }

  // Crear 3 turnos futuros con plazas de empleado:
  //   turno1: 10:00–14:00
  //   turno2: 16:00–20:00  (no solapa con ninguno)
  //   turnoSolape: 12:00–15:00  (solapa con turno1)
  // Usamos fechas en 2099 para que el formulario los muestre siempre como futuros.
  const BASE = new Date("2099-06-01T00:00:00Z");

  const turno1 = await prisma.turno.create({
    data: {
      edicionId: edicion.id,
      casetaId: caseta.id,
      fechaInicio: new Date(BASE.getTime() + 10 * 3600_000),  // 10:00
      fechaFin:   new Date(BASE.getTime() + 14 * 3600_000),   // 14:00
      plazas: {
        create: [{ tipoEmpleadoId: tipoEmpleado.id, cantidad: 5 }],
      },
    },
    select: { id: true },
  });

  const turno2 = await prisma.turno.create({
    data: {
      edicionId: edicion.id,
      casetaId: caseta.id,
      fechaInicio: new Date(BASE.getTime() + 16 * 3600_000),  // 16:00
      fechaFin:   new Date(BASE.getTime() + 20 * 3600_000),   // 20:00
      plazas: {
        create: [{ tipoEmpleadoId: tipoEmpleado.id, cantidad: 5 }],
      },
    },
    select: { id: true },
  });

  // turnoSolape: 12:00–15:00, solapa con turno1 (10:00–14:00)
  const turnoSolape = await prisma.turno.create({
    data: {
      edicionId: edicion.id,
      casetaId: caseta.id,
      fechaInicio: new Date(BASE.getTime() + 12 * 3600_000),  // 12:00
      fechaFin:   new Date(BASE.getTime() + 15 * 3600_000),   // 15:00
      plazas: {
        create: [{ tipoEmpleadoId: tipoEmpleado.id, cantidad: 5 }],
      },
    },
    select: { id: true },
  });

  // Crear empleado de búsqueda (DNI conocido, activo, no voluntario)
  const dniSeed = "12345678X";
  await prisma.empleado.upsert({
    where: { dni: dniSeed },
    update: { activo: true, esVoluntario: false, nombre: "Ana García" },
    create: {
      nombre: "Ana García",
      dni: dniSeed,
      email: "ana.garcia@empleado.test",
      esVoluntario: false,
      activo: true,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      formularioToken,
      edicionId: edicion.id,
      casetaId: caseta.id,
      turno1Id: turno1.id,
      turno2Id: turno2.id,
      turnoSolapeId: turnoSolape.id,
      dniSeed,
    },
  });
}
