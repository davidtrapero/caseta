import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/authz";
import { obtenerEdicionActiva } from "@/lib/edicion";

export async function GET(req: Request) {
  await requirePermiso("caja.cierres.ver");

  const url = new URL(req.url);
  let edicionId = url.searchParams.get("edicionId") ?? undefined;

  if (!edicionId) {
    const activa = await obtenerEdicionActiva();
    edicionId = activa?.id;
  }
  if (!edicionId) {
    return NextResponse.json({ error: "No hay edición activa." }, { status: 400 });
  }

  const edicion = await prisma.edicion.findUnique({
    where: { id: edicionId },
    select: { anio: true },
  });
  if (!edicion) {
    return NextResponse.json({ error: "Edición no encontrada." }, { status: 404 });
  }

  const cierres = await prisma.cierreDiario.findMany({
    where: { edicionId },
    include: { caseta: { select: { nombre: true } } },
    orderBy: [{ fecha: "asc" }, { caseta: { nombre: "asc" } }],
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Cierres");

  ws.columns = [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Caseta", key: "caseta", width: 22 },
    { header: "Ingresos", key: "ingresos", width: 16 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Notas", key: "notas", width: 40 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const c of cierres) {
    const row = ws.addRow({
      fecha: c.fecha,
      caseta: c.caseta.nombre,
      ingresos: Number(c.ingresosTotales),
      estado: c.bloqueado ? "Bloqueado" : "Abierto",
      notas: c.notas ?? "",
    });
    row.getCell("fecha").numFmt = "yyyy-mm-dd";
    row.getCell("ingresos").numFmt = '#,##0.00 "€"';
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `cierres-${edicion.anio}-${ts}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
