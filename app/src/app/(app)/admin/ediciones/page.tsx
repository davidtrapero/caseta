import Link from "next/link";
import { headers } from "next/headers";
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
import { SectionHeader, EmptyState } from "../_components/page-header";
import { ToggleActivaForm } from "./_components/toggle-activa";
import { PublicarFormulario } from "./_components/publicar-formulario";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function EdicionesPage() {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeEditar = user.rol === "admin";
  const puedePublicar = user.rol === "admin" || user.rol === "gerente";

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  const ediciones = await prisma.edicion.findMany({
    orderBy: [{ activa: "desc" }, { anio: "desc" }],
  });

  return (
    <div>
      <SectionHeader
        title="Ediciones de la feria"
        subtitle="Cada año es una edición. Pueden coexistir varias marcadas como activas."
        actionHref="/admin/ediciones/nueva"
        actionLabel="Nueva edición"
        canAct={puedeEditar}
      />

      {ediciones.length === 0 ? (
        <EmptyState
          title="Sin ediciones registradas"
          description="Crea la primera edición para empezar a asignar turnos, cierres y gastos."
          actionHref={puedeEditar ? "/admin/ediciones/nueva" : undefined}
          actionLabel={puedeEditar ? "Crear edición" : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Año</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead className="w-32">Estado</TableHead>
              <TableHead>Formulario público</TableHead>
              <TableHead className="w-28 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ediciones.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono">{e.anio}</TableCell>
                <TableCell className="font-medium">{e.nombre}</TableCell>
                <TableCell className="text-muted-foreground">
                  {FORMATO_FECHA.format(e.fechaInicio)} — {FORMATO_FECHA.format(e.fechaFin)}
                </TableCell>
                <TableCell>
                  <ToggleActivaForm
                    id={e.id}
                    activa={e.activa}
                    disabled={!puedeEditar}
                  />
                </TableCell>
                <TableCell>
                  <PublicarFormulario
                    edicionId={e.id}
                    token={e.formularioToken}
                    baseUrl={baseUrl}
                    disabled={!puedePublicar}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {puedeEditar ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/ediciones/${e.id}`}>Editar</Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Solo lectura</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
