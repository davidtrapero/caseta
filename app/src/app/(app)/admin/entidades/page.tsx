import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionHeader, EmptyState } from "../_components/page-header";
import {
  CrearEntidadForm,
  RenombrarEntidadForm,
} from "./_components/entidad-form";
import { ToggleActivaEntidadForm } from "./_components/toggle-activa";

export default async function EntidadesPage() {
  await requireRole(["admin", "gerente"]);

  const entidades = await prisma.entidadVoluntario.findMany({
    orderBy: [{ activa: "desc" }, { nombre: "asc" }],
    include: {
      _count: {
        select: { empleados: true, solicitudes: true },
      },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Entidades de voluntarios"
        subtitle="Hermandades, peñas o agrupaciones a las que pertenecen los voluntarios. Las inactivas no aparecen en el formulario público pero conservan sus referencias."
      />

      <section className="rounded-lg border bg-card p-6">
        <h3 className="text-sm font-medium mb-4">Crear nueva entidad</h3>
        <CrearEntidadForm />
      </section>

      {entidades.length === 0 ? (
        <EmptyState
          title="Sin entidades registradas"
          description="Crea al menos una entidad para poder publicar el formulario público de voluntarios."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-32 text-right">Empleados</TableHead>
              <TableHead className="w-32 text-right">Solicitudes</TableHead>
              <TableHead className="w-32">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entidades.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">
                  <RenombrarEntidadForm id={e.id} nombreActual={e.nombre} />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {e._count.empleados}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {e._count.solicitudes}
                </TableCell>
                <TableCell>
                  <ToggleActivaEntidadForm id={e.id} activa={e.activa} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
