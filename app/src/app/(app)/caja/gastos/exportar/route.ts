import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { CATEGORIA_LABEL, type CategoriaGasto } from "../_lib/categorias";

export async function GET(req: Request) {
  await requireRole(["admin", "gerente", "cajero"]);

  const url = new URL(req.url);
  let edicionId = url.searchParams.get("edicionId") ?? undefined;
  const filtroCaseta = url.searchParams.get("caseta");

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

  const filtroWhere =
    filtroCaseta === "central"
      ? { casetaId: null }
      : filtroCaseta
        ? { casetaId: filtroCaseta }
        : {};

  const gastos = await prisma.gasto.findMany({
    where: { edicionId, ...filtroWhere },
    include: { caseta: { select: { nombre: true } } },
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Gastos");

  ws.columns = [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Caseta", key: "caseta", width: 22 },
    { header: "Categoría", key: "categoria", width: 18 },
    { header: "Descripción", key: "descripcion", width: 40 },
    { header: "Monto", key: "monto", width: 16 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const g of gastos) {
    const row = ws.addRow({
      fecha: g.fecha,
      caseta: g.caseta?.nombre ?? "Centralizado",
      categoria: CATEGORIA_LABEL[g.categoria as CategoriaGasto] ?? g.categoria,
      descripcion: g.descripcion,
      monto: Number(g.monto),
    });
    row.getCell("fecha").numFmt = "yyyy-mm-dd";
    row.getCell("monto").numFmt = '#,##0.00 "€"';
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `gastos-${edicion.anio}-${ts}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
