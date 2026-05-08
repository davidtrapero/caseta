import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { BOM, toCsvRow } from "@/lib/csv";
import { cargarAsistencias } from "../_lib/query";

const FECHA_ISO = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatFecha(d: Date): string {
  return FECHA_ISO.format(d).replace(" ", " ");
}

function parseTipos(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export async function GET(req: Request) {
  await requireRole(["admin", "gerente"]);

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

  const empleados = await cargarAsistencias({
    edicionId,
    tipoEmpleadoIds,
    entidadId,
    casetaId,
  });

  const lineas: string[] = [];
  lineas.push(
    toCsvRow([
      "nombre",
      "tipo",
      "entidad",
      "dni",
      "telefono",
      "caseta",
      "fecha_inicio",
      "fecha_fin",
    ])
  );

  for (const e of empleados) {
    for (const a of e.asignaciones) {
      lineas.push(
        toCsvRow([
          e.nombre,
          e.tipoEmpleado.label,
          e.entidad?.nombre ?? "",
          e.dni ?? "",
          e.telefono ?? "",
          a.turno.caseta.nombre,
          formatFecha(a.turno.fechaInicio),
          formatFecha(a.turno.fechaFin),
        ])
      );
    }
  }

  const cuerpo = BOM + lineas.join("\r\n") + "\r\n";
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `asistencias-${edicion.anio}-${ts}.csv`;

  return new NextResponse(cuerpo, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
