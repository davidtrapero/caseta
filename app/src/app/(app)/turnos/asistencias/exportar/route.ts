import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/authz";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { cargarAsistencias } from "../_lib/query";

function parseTipos(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export async function GET(req: Request) {
  await requirePermiso("turnos.imprimir");

  const url = new URL(req.url);
  let edicionId = url.searchParams.get("edicionId") ?? undefined;
  const tipoEmpleadoIds = parseTipos(url.searchParams.get("tipos"));
  const entidadId = url.searchParams.get("entidadId") ?? undefined;
  const casetaId = url.searchParams.get("casetaId") ?? undefined;

  if (!edicionId) {
    const activa = await obtenerEdicionActiva();
    edicionId = activa?.id;
  }
  if (!edicionId) {
    return NextResponse.json(
      { error: "No hay edición activa." },
      { status: 400 }
    );
  }

  const edicion = await prisma.edicion.findUnique({
    where: { id: edicionId },
    select: { anio: true },
  });
  if (!edicion) {
    return NextResponse.json({ error: "Edición no encontrada." }, { status: 404 });
  }

  // Sin skip/take para exportar todos los registros
  const { empleados } = await cargarAsistencias({
    edicionId,
    tipoEmpleadoIds,
    entidadId,
    casetaId,
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Asistencias");

  ws.columns = [
    { header: "Nombre", key: "nombre", width: 28 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Entidad", key: "entidad", width: 22 },
    { header: "DNI", key: "dni", width: 12 },
    { header: "Teléfono", key: "telefono", width: 14 },
    { header: "Caseta", key: "caseta", width: 18 },
    { header: "Inicio", key: "fechaInicio", width: 18 },
    { header: "Fin", key: "fechaFin", width: 18 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const e of empleados) {
    for (const a of e.asignaciones) {
      ws.addRow({
        nombre: e.nombre,
        tipo: e.tipos[0]?.tipoEmpleado.label ?? "—",
        entidad: e.entidad?.nombre ?? "",
        dni: e.dni ?? "",
        telefono: e.telefono ?? "",
        caseta: a.turno.caseta.nombre,
        fechaInicio: a.turno.fechaInicio,
        fechaFin: a.turno.fechaFin,
      });
    }
  }

  ws.getColumn("fechaInicio").numFmt = "yyyy-mm-dd hh:mm";
  ws.getColumn("fechaFin").numFmt = "yyyy-mm-dd hh:mm";

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();

  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `asistencias-${edicion.anio}-${ts}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
