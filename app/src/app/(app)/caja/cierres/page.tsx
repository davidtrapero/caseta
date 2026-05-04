import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SectionHeader,
  EmptyState,
} from "../../admin/_components/page-header";
import { obtenerEdicionActiva } from "../_lib/edicion-activa";
import {
  BotonBloquear,
  BotonDesbloquear,
  BotonEliminar,
} from "./_components/acciones-cierre";

const FORMATO_EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default async function CierresPage() {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeCrear = true;
  const esAdmin = user.rol === "admin";
  const puedeBloquear = user.rol === "admin" || user.rol === "gerente";

  const edicion = await obtenerEdicionActiva();

  if (!edicion) {
    return (
      <div>
        <SectionHeader
          title="Cierres diarios"
          subtitle="Ingresos totales por caseta y día."
        />
        <EmptyState
          title="No hay edición activa"
          description="Activa una edición en Administración para registrar cierres."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  const cierres = await prisma.cierreDiario.findMany({
    where: { edicionId: edicion.id },
    include: { caseta: { select: { nombre: true } } },
    orderBy: [{ fecha: "desc" }, { caseta: { nombre: "asc" } }],
  });

  return (
    <div>
      <SectionHeader
        title={`Cierres — ${edicion.nombre}`}
        subtitle="Ingresos diarios por caseta. Una vez bloqueado, solo admin puede editar."
        actionHref="/caja/cierres/nuevo"
        actionLabel="Nuevo cierre"
        canAct={puedeCrear}
      />

      {cierres.length === 0 ? (
        <EmptyState
          title="Sin cierres registrados"
          description="Registra el primer cierre del día para una caseta."
          actionHref="/caja/cierres/nuevo"
          actionLabel="Crear cierre"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Fecha</TableHead>
              <TableHead>Caseta</TableHead>
              <TableHead className="w-40 text-right">Ingresos</TableHead>
              <TableHead className="w-28">Estado</TableHead>
              <TableHead className="w-60 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cierres.map((c) => {
              const importe = Number(c.ingresosTotales);
              const puedeEditar = !c.bloqueado || esAdmin;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">
                    {FORMATO_FECHA.format(c.fecha)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {c.caseta.nombre}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {FORMATO_EUR.format(importe)}
                  </TableCell>
                  <TableCell>
                    {c.bloqueado ? (
                      <Badge variant="default">Bloqueado</Badge>
                    ) : (
                      <Badge variant="outline">Abierto</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-3">
                      {puedeEditar ? (
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/caja/cierres/${c.id}`}>Editar</Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/caja/cierres/${c.id}`}>Ver</Link>
                        </Button>
                      )}
                      {!c.bloqueado && puedeBloquear ? (
                        <BotonBloquear id={c.id} />
                      ) : null}
                      {c.bloqueado && esAdmin ? (
                        <BotonDesbloquear id={c.id} />
                      ) : null}
                      {esAdmin ? <BotonEliminar id={c.id} /> : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
