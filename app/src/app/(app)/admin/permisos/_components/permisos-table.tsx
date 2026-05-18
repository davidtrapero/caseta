"use client";

import { useActionState, useTransition } from "react";
import type { Rol } from "@prisma/client";
import { actualizarPermisoAction } from "../actions";
import { PermisosCheckbox } from "./permisos-checkbox";

interface PermisoRow {
  permiso: string;
  descripcion: string;
  roles: Array<{ rol: Rol; tiene: boolean }>;
}

interface PermisosTableProps {
  data: PermisoRow[];
  roles: Rol[];
}

export function PermisosTable({ data, roles }: PermisosTableProps) {
  const [state, formAction, isPending] = useActionState(actualizarPermisoAction, null);
  const [isTransitioning, startTransition] = useTransition();

  const handleChange = (rol: Rol, permiso: string, activo: boolean) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("rol", rol);
      formData.set("permiso", permiso);
      formData.set("activo", String(activo));
      await formAction(formData);
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 min-w-60">
              Permiso
            </th>
            {roles.map((rol) => (
              <th
                key={rol}
                className="px-4 py-3 text-center text-sm font-semibold text-gray-900 capitalize"
              >
                {rol}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row) => (
            <tr key={row.permiso} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-mono text-sm text-gray-900">{row.permiso}</div>
                <div className="text-xs text-gray-600 mt-1">{row.descripcion}</div>
              </td>
              {row.roles.map(({ rol, tiene }) => (
                <td key={`${row.permiso}-${rol}`} className="px-4 py-3 text-center">
                  <PermisosCheckbox
                    rol={rol}
                    permiso={row.permiso}
                    checked={tiene}
                    onChange={(activo) => handleChange(rol, row.permiso, activo)}
                    disabled={isTransitioning || rol === "admin"}
                    isAdmin={rol === "admin"}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {state && !state.ok && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200 text-sm text-red-700">
          {state.error}
        </div>
      )}
    </div>
  );
}
