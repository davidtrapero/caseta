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
import { SectionHeader, EmptyState } from "../_components/page-header";
import { ToggleActivoUsuarioForm } from "./_components/toggle-activo";
import { DialogoResetearPassword } from "./_components/DialogoResetearPassword";

const ROL_ETIQUETA: Record<string, string> = {
  admin: "Admin",
  gerente: "Gerente",
  cajero: "Cajero",
};

export default async function UsuariosPage() {
  const { user } = await requireRole(["admin", "gerente"]);
  const puedeEditar = user.rol === "admin";

  const usuarios = await prisma.user.findMany({
    orderBy: [{ activo: "desc" }, { name: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      rol: true,
      activo: true,
    },
  });

  return (
    <div>
      <SectionHeader
        title="Usuarios"
        subtitle="Cuentas con acceso a la aplicación. Los empleados de caseta no son usuarios."
        actionHref="/admin/usuarios/nuevo"
        actionLabel="Nuevo usuario"
        canAct={puedeEditar}
      />

      {usuarios.length === 0 ? (
        <EmptyState
          title="Sin usuarios registrados"
          description="Crea cuentas para que el equipo pueda acceder a la aplicación."
          actionHref={puedeEditar ? "/admin/usuarios/nuevo" : undefined}
          actionLabel={puedeEditar ? "Crear usuario" : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-28">Rol</TableHead>
              <TableHead className="w-32">Estado</TableHead>
              <TableHead className="w-64 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => {
              const esSelf = u.id === user.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.email}</TableCell>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROL_ETIQUETA[u.rol] ?? u.rol}</Badge>
                  </TableCell>
                  <TableCell>
                    {puedeEditar ? (
                      <ToggleActivoUsuarioForm
                        id={u.id}
                        activo={u.activo}
                        esSelf={esSelf}
                      />
                    ) : (
                      <Badge variant={u.activo ? "active" : "inactive"}>
                        {u.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {puedeEditar ? (
                      <div className="flex items-center justify-end gap-1">
                        {u.activo ? (
                          <DialogoResetearPassword
                            userId={u.id}
                            userName={u.name}
                          />
                        ) : null}
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/admin/usuarios/${u.id}`}>Editar</Link>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Solo lectura</span>
                    )}
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
