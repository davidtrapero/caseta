import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { obtenerEdicionActiva } from "@/lib/edicion";

export async function GET(req: Request) {
  await requireRole(["admin", "gerente", "cajero"]);

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

  const nominas = await prisma.nomina.findMany({
    where: { edicionId },
    include: {
      empleado: { select: { nombre: true, dni: true } },
    },
    orderBy: [{ pagada: "asc" }, { empleado: { nombre: "asc" } }],
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Nóminas");

  ws.columns = [
    { header: "Empleado", key: "empleado", width: 28 },
    { header: "DNI", key: "dni", width: 12 },
    { header: "Días trabajados", key: "dias", width: 16 },
    { header: "Jornal aplicado", key: "jornal", width: 16 },
    { header: "Total", key: "total", width: 16 },
    { header: "Pagada", key: "pagada", width: 10 },
    { header: "Fecha pago", key: "fechaPago", width: 14 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const n of nominas) {
    const row = ws.addRow({
      empleado: n.empleado.nombre,
      dni: n.empleado.dni ?? "",
      dias: n.diasTrabajados,
      jornal: Number(n.jornalAplicado),
      total: Number(n.total),
      pagada: n.pagada ? "Sí" : "No",
      fechaPago: n.fechaPago ?? null,
    });
    row.getCell("jornal").numFmt = '#,##0.00 "€"';
    row.getCell("total").numFmt = '#,##0.00 "€"';
    if (n.fechaPago) {
      row.getCell("fechaPago").numFmt = "yyyy-mm-dd";
    }
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `nominas-${edicion.anio}-${ts}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
