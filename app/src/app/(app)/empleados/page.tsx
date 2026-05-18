import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import type { Prisma } from "@prisma/client";
import { SectionHeader, EmptyState } from "../admin/_components/page-header";
import { EmpleadosFilters } from "./_components/empleados-filters";
import { EmpleadoCard } from "./_components/empleado-card";
import { ordenarTipos } from "../turnos/_lib/perfiles";

type SP = Promise<{
  q?: string;
  tipoId?: string;
  soloActivos?: string;
}>;

export default async function EmpleadosPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeEditar = user.rol === "admin" || user.rol === "gerente";

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const tipoId = sp.tipoId ?? "";
  // default true. Solo se desactiva cuando explícitamente llega "0".
  const soloActivos = sp.soloActivos !== "0";

  const where: Prisma.EmpleadoWhereInput = {
    ...(soloActivos ? { activo: true } : {}),
    ...(tipoId ? { tipos: { some: { tipoEmpleadoId: tipoId } } } : {}),
    ...(q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { dni: { contains: q, mode: "insensitive" } },
            { telefono: { contains: q } },
          ],
        }
      : {}),
  };

  // Inicio del día actual (servidor) — turnos futuros desde 00:00 hoy.
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [empleados, tiposEmpleado] = await Promise.all([
    prisma.empleado.findMany({
      where,
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      include: {
        tipos: { include: { tipoEmpleado: true } },
        asignaciones: {
          where: {
            turno: {
              fechaInicio: { gte: hoy },
              edicion: { activa: true },
            },
          },
          include: {
            turno: {
              include: { caseta: { select: { nombre: true } } },
            },
          },
          orderBy: { turno: { fechaInicio: "asc" } },
        },
      },
    }),
    prisma.tipoEmpleado.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
    }),
  ]);

  const tiposLite = ordenarTipos(
    tiposEmpleado.map((t) => ({
      id: t.id,
      slug: t.slug,
      label: t.label,
      labelCorto: t.labelCorto,
      colorHex: t.colorHex,
      esVoluntario: t.esVoluntario,
      orden: t.orden,
    }))
  );

  const hayFiltrosActivos = q !== "" || tipoId !== "" || !soloActivos;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Personal"
        subtitle="Personal disponible para turnos."
        actionHref="/empleados/nuevo"
        actionLabel="Añadir persona"
        canAct={puedeEditar}
      />

      <EmpleadosFilters
        tiposEmpleado={tiposLite}
        initialQ={q}
        initialTipoId={tipoId}
        initialSoloActivos={soloActivos}
      />

      {empleados.length === 0 ? (
        hayFiltrosActivos ? (
          <EmptyState
            title="Sin resultados"
            description="Ninguna persona coincide con los filtros aplicados. Prueba a limpiar la búsqueda."
          />
        ) : (
          <EmptyState
            title="Sin personal registrado"
            description="Registra el personal para poder asignarle turnos y calcular nóminas."
            actionHref={puedeEditar ? "/empleados/nuevo" : undefined}
            actionLabel={puedeEditar ? "Añadir persona" : undefined}
          />
        )
      ) : (
        <div className="flex flex-col gap-3">
          {empleados.map((e) => (
            <EmpleadoCard
              key={e.id}
              puedeEditar={puedeEditar}
              empleado={{
                id: e.id,
                nombre: e.nombre,
                dni: e.dni,
                telefono: e.telefono,
                email: e.email,
                jornalDiario: e.jornalDiario ? Number(e.jornalDiario) : null,
                activo: e.activo,
                tipos: e.tipos.map((et) => ({
                  id: et.tipoEmpleado.id,
                  slug: et.tipoEmpleado.slug,
                  label: et.tipoEmpleado.label,
                  labelCorto: et.tipoEmpleado.labelCorto,
                  colorHex: et.tipoEmpleado.colorHex,
                  esVoluntario: et.tipoEmpleado.esVoluntario,
                  orden: et.tipoEmpleado.orden,
                })),
                turnos: e.asignaciones.map((a) => ({
                  id: a.turno.id,
                  fechaInicio: a.turno.fechaInicio,
                  fechaFin: a.turno.fechaFin,
                  caseta: { nombre: a.turno.caseta.nombre },
                })),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
