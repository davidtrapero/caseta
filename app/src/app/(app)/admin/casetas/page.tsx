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
import { SectionHeader, EmptyState } from "../_components/page-header";
import { ToggleActivaCasetaForm } from "./_components/toggle-activa";

export default async function CasetasPage() {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeEditar = user.rol === "admin" || user.rol === "gerente";

  const casetas = await prisma.caseta.findMany({
    orderBy: [{ activa: "desc" }, { nombre: "asc" }],
  });

  return (
    <div>
      <SectionHeader
        title="Casetas"
        subtitle="Puntos de venta físicos. Transversales entre ediciones."
        actionHref="/admin/casetas/nueva"
        actionLabel="Nueva caseta"
        canAct={puedeEditar}
      />

      {casetas.length === 0 ? (
        <EmptyState
          title="Sin casetas registradas"
          description="Crea la primera caseta para empezar a asignar turnos y cierres."
          actionHref={puedeEditar ? "/admin/casetas/nueva" : undefined}
          actionLabel={puedeEditar ? "Crear caseta" : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="w-40">Estado</TableHead>
              <TableHead className="w-28 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {casetas.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nombre}</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.ubicacion ?? "—"}
                </TableCell>
                <TableCell>
                  <ToggleActivaCasetaForm
                    id={c.id}
                    activa={c.activa}
                    disabled={!puedeEditar}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {puedeEditar ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/casetas/${c.id}`}>Editar</Link>
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
