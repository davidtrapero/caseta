import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { Button } from "@/components/ui/button";
import { SectionHeader, EmptyState } from "../../admin/_components/page-header";
import { cargarAsistencias } from "./_lib/query";
import { FiltrosAsistencias } from "./_components/filtros";
import { TablaAsistencias, type FilaEmpleado } from "./_components/tabla-asistencias";

type SP = Promise<{
  edicionId?: string;
  tipos?: string;
  entidadId?: string;
  casetaId?: string;
}>;

function parseTipos(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export default async function AsistenciasPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  await requireRole(["admin", "gerente"]);
  const sp = await searchParams;

  const ediciones = await prisma.edicion.findMany({
    orderBy: [{ activa: "desc" }, { anio: "desc" }],
    select: { id: true, anio: true, nombre: true, activa: true },
  });

  let edicionId = sp.edicionId;
  if (!edicionId) {
    const activa = await obtenerEdicionActiva();
    edicionId = activa?.id ?? ediciones[0]?.id;
  }

  if (!edicionId) {
    return (
      <div>
        <SectionHeader title="Asistencias" />
        <EmptyState
          title="Sin ediciones"
          description="Crea una edición antes de consultar asistencias."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  const tipoEmpleadoIds = parseTipos(sp.tipos);

  const [entidades, casetas, tiposEmpleado, empleados] = await Promise.all([
    prisma.entidadVoluntario.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.caseta.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.tipoEmpleado.findMany({
      orderBy: { orden: "asc" },
    }),
    cargarAsistencias({
      edicionId,
      tipoEmpleadoIds,
      entidadId: sp.entidadId,
      casetaId: sp.casetaId,
    }),
  ]);

  const filas: FilaEmpleado[] = empleados.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    tipoLabel: e.tipoEmpleado.label,
    tipoColorHex: e.tipoEmpleado.colorHex,
    entidad: e.entidad?.nombre ?? null,
    asistencias: e.asignaciones.map((a) => ({
      id: a.id,
      casetaNombre: a.turno.caseta.nombre,
      fechaInicio: a.turno.fechaInicio.toISOString(),
      fechaFin: a.turno.fechaFin.toISOString(),
    })),
  }));

  const exportParams = new URLSearchParams();
  exportParams.set("edicionId", edicionId);
  if (sp.tipos) exportParams.set("tipos", sp.tipos);
  if (sp.entidadId) exportParams.set("entidadId", sp.entidadId);
  if (sp.casetaId) exportParams.set("casetaId", sp.casetaId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <SectionHeader
          title="Asistencias"
          subtitle="Empleados que han asistido a turnos. Filtros aplican a página y exportación."
        />
        <Button asChild variant="outline">
          <Link
            href={`/turnos/asistencias/exportar?${exportParams.toString()}`}
            prefetch={false}
          >
            Exportar CSV
          </Link>
        </Button>
      </div>

      <FiltrosAsistencias
        ediciones={ediciones}
        edicionId={edicionId}
        entidades={entidades}
        entidadId={sp.entidadId ?? ""}
        casetas={casetas}
        casetaId={sp.casetaId ?? ""}
        tiposEmpleado={tiposEmpleado.map((t) => ({
          id: t.id,
          slug: t.slug,
          label: t.label,
          labelCorto: t.labelCorto,
          colorHex: t.colorHex,
          esVoluntario: t.esVoluntario,
          orden: t.orden,
        }))}
        tiposActivos={tipoEmpleadoIds}
      />

      {filas.length === 0 ? (
        <EmptyState
          title="Sin asistencias"
          description="Ningún empleado tiene asistencias registradas con los filtros actuales."
        />
      ) : (
        <TablaAsistencias filas={filas} />
      )}
    </div>
  );
}
