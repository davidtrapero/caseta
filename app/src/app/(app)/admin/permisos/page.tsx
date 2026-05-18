import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/authz";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/lib/permissions/catalog";
import type { Rol } from "@prisma/client";
import { PermisosTable } from "./_components/permisos-table";

const ROLES: Rol[] = ["admin", "gerente", "cajero"];

export default async function PermisosPage() {
  // Validar permiso para ver la página
  await requirePermiso("admin.permisos.ver");

  // Cargar matriz actual de permisos
  const rolPermisos = await prisma.rolPermiso.findMany({
    select: { rol: true, permiso: true },
  });

  // Construir mapa: rol → Set<permiso>
  const permisosPorRol = new Map<Rol, Set<string>>();
  for (const rol of ROLES) {
    permisosPorRol.set(rol, new Set());
  }
  for (const { rol, permiso } of rolPermisos) {
    permisosPorRol.get(rol)?.add(permiso);
  }

  // Construir datos para la tabla
  const data = ALL_PERMISSIONS.map((permiso) => ({
    permiso,
    descripcion: PERMISSIONS[permiso as keyof typeof PERMISSIONS],
    roles: ROLES.map((rol) => ({
      rol,
      tiene: permisosPorRol.get(rol)?.has(permiso) ?? false,
    })),
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Matriz de Permisos</h1>
        <p className="text-sm text-gray-600 mt-2">
          Edita los permisos granulares para cada rol. Los cambios se aplican inmediatamente.
        </p>
      </div>

      <PermisosTable data={data} roles={ROLES} />
    </div>
  );
}
