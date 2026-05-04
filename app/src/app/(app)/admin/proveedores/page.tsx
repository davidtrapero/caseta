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
import { ToggleActivoProveedorForm } from "./_components/toggle-activo";

export default async function ProveedoresPage() {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeEditar = user.rol === "admin" || user.rol === "gerente";

  const proveedores = await prisma.proveedor.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });

  return (
    <div>
      <SectionHeader
        title="Proveedores"
        subtitle="Empresas que suministran productos a las casetas."
        actionHref="/admin/proveedores/nuevo"
        actionLabel="Nuevo proveedor"
        canAct={puedeEditar}
      />

      {proveedores.length === 0 ? (
        <EmptyState
          title="Sin proveedores registrados"
          description="Registra proveedores para empezar a crear pedidos."
          actionHref={puedeEditar ? "/admin/proveedores/nuevo" : undefined}
          actionLabel={puedeEditar ? "Crear proveedor" : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-40">Teléfono</TableHead>
              <TableHead className="w-32">Estado</TableHead>
              <TableHead className="w-28 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proveedores.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.contacto ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.email ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.telefono ?? "—"}
                </TableCell>
                <TableCell>
                  <ToggleActivoProveedorForm
                    id={p.id}
                    activo={p.activo}
                    disabled={!puedeEditar}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {puedeEditar ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/proveedores/${p.id}`}>Editar</Link>
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
