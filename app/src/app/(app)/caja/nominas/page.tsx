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
import { Badge } from "@/components/ui/badge";
import {
  SectionHeader,
  EmptyState,
} from "../../admin/_components/page-header";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { BotonCalcular } from "./_components/boton-calcular";
import {
  BotonMarcarPagada,
  BotonDesmarcarPagada,
} from "./_components/acciones-nomina";

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

export default async function NominasPage() {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const esAdmin = user.rol === "admin";
  const puedeCalcular = user.rol === "admin" || user.rol === "gerente";

  const edicion = await obtenerEdicionActiva();

  if (!edicion) {
    return (
      <div>
        <SectionHeader
          title="Nóminas"
          subtitle="Nóminas de la edición."
        />
        <EmptyState
          title="No hay edición activa"
          description="Activa una edición en Administración para calcular nóminas."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  const nominas = await prisma.nomina.findMany({
    where: { edicionId: edicion.id },
    include: {
      empleado: {
        select: { id: true, nombre: true, activo: true },
      },
    },
    orderBy: [{ pagada: "asc" }, { empleado: { nombre: "asc" } }],
  });

  // Bloqueo para gerente si hay pagadas.
  const hayPagadas = nominas.some((n) => n.pagada);
  const bloqueadoParaEsteUsuario = hayPagadas && !esAdmin;

  const totalEdicion = nominas.reduce((acc, n) => acc + Number(n.total), 0);
  const totalPagado = nominas
    .filter((n) => n.pagada)
    .reduce((acc, n) => acc + Number(n.total), 0);
  const totalPendiente = totalEdicion - totalPagado;

  return (
    <div>
      <SectionHeader
        title={`Nóminas — ${edicion.nombre}`}
        subtitle="Nóminas de la edición."
      />

      {puedeCalcular ? (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <BotonCalcular bloqueado={bloqueadoParaEsteUsuario} />
        </div>
      ) : null}

      {nominas.length === 0 ? (
        <EmptyState
          title="Sin nóminas calculadas"
          description={
            puedeCalcular
              ? "Pulsa 'Calcular nóminas' para generar las nóminas de los empleados con asistencia registrada."
              : "Aún no se han calculado las nóminas de esta edición."
          }
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <ResumenCard label="Total edición" valor={totalEdicion} />
            <ResumenCard label="Pagado" valor={totalPagado} />
            <ResumenCard label="Pendiente" valor={totalPendiente} destacar />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead className="w-24 text-right">Días</TableHead>
                <TableHead className="w-32 text-right">Jornal</TableHead>
                <TableHead className="w-36 text-right">Total</TableHead>
                <TableHead className="w-32">Estado</TableHead>
                <TableHead className="w-32">Pago</TableHead>
                <TableHead className="w-40 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nominas.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">
                    {n.empleado.nombre}
                    {!n.empleado.activo ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (inactivo)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {n.diasTrabajados}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {FORMATO_EUR.format(Number(n.jornalAplicado))}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {FORMATO_EUR.format(Number(n.total))}
                  </TableCell>
                  <TableCell>
                    {n.pagada ? (
                      <Badge variant="active">Pagada</Badge>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {n.fechaPago ? FORMATO_FECHA.format(n.fechaPago) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-3">
                      {esAdmin && !n.pagada ? (
                        <BotonMarcarPagada id={n.id} />
                      ) : null}
                      {esAdmin && n.pagada ? (
                        <BotonDesmarcarPagada id={n.id} />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}

function ResumenCard({
  label,
  valor,
  destacar,
}: {
  label: string;
  valor: number;
  destacar?: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4"
      style={{ boxShadow: "var(--surface-glass-shadow)" }}
    >
      <p className="text-xs uppercase tracking-wider text-primary">
        {label}
      </p>
      <p
        className={
          destacar
            ? "mt-1 font-mono text-2xl font-medium text-primary"
            : "mt-1 font-mono text-2xl"
        }
      >
        {FORMATO_EUR.format(valor)}
      </p>
    </div>
  );
}
