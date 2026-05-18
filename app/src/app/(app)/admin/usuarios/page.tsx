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
import { parseListParams } from "@/lib/list-params";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { SortableHeader } from "@/components/ui/sortable-header";

const ROL_ETIQUETA: Record<string, string> = {
  admin: "Admin",
  gerente: "Gerente",
  cajero: "Cajero",
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { user } = await requireRole(["admin", "gerente"]);
  const puedeEditar = user.rol === "admin";
  const sp = await searchParams;

  const listParams = parseListParams(sp, {
    defaultPageSize: 25,
    allowedPageSizes: [10, 25, 50, 100],
    allowedSorts: ["email", "nombre", "rol"],
  });

  // Construir orderBy dinámico
  let orderBy: any = [{ activo: "desc" }, { name: "asc" }];
  if (listParams.sort) {
    const direction = listParams.order ?? "asc";
    if (listParams.sort === "email") {
      orderBy = [{ email: direction }];
    } else if (listParams.sort === "nombre") {
      orderBy = [{ name: direction }];
    } else if (listParams.sort === "rol") {
      orderBy = [{ rol: direction }, { name: "asc" }];
    }
  }

  const [usuarios, total] = await Promise.all([
    prisma.user.findMany({
      orderBy,
      select: {
        id: true,
        email: true,
        name: true,
        rol: true,
        activo: true,
      },
      skip: listParams.skip,
      take: listParams.take,
    }),
    prisma.user.count(),
  ]);

  return (
    <div>
      <SectionHeader
        title="Usuarios"
        subtitle="Cuentas con acceso a la aplicación. El personal de caseta no tiene cuenta de acceso."
        actionHref="/admin/usuarios/nuevo"
        actionLabel="Nuevo usuario"
        canAct={puedeEditar}
      />

      <div className="mb-4 flex items-center justify-between">
        <PageSizeSelect
          currentPageSize={listParams.pageSize}
          basePath="/admin/usuarios"
        />
      </div>

      {usuarios.length === 0 ? (
        <EmptyState
          title="Sin usuarios registrados"
          description="Crea cuentas para que el equipo pueda acceder a la aplicación."
          actionHref={puedeEditar ? "/admin/usuarios/nuevo" : undefined}
          actionLabel={puedeEditar ? "Crear usuario" : undefined}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    column="email"
                    label="Email"
                    basePath="/admin/usuarios"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    column="nombre"
                    label="Nombre"
                    basePath="/admin/usuarios"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
                <TableHead className="w-28">
                  <SortableHeader
                    column="rol"
                    label="Rol"
                    basePath="/admin/usuarios"
                    currentSort={listParams.sort}
                    currentOrder={listParams.order}
                  />
                </TableHead>
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
          <DataTablePagination
            page={listParams.page}
            pageSize={listParams.pageSize}
            total={total}
            basePath="/admin/usuarios"
          />
        </>
      )}
    </div>
  );
}
