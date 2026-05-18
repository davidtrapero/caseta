"use client";

import type { Rol } from "@prisma/client";

interface PermisosCheckboxProps {
  rol: Rol;
  permiso: string;
  checked: boolean;
  onChange: (activo: boolean) => void;
  disabled: boolean;
  isAdmin: boolean;
}

export function PermisosCheckbox({
  rol,
  permiso,
  checked,
  onChange,
  disabled,
  isAdmin,
}: PermisosCheckboxProps) {
  // Admin siempre tiene todos los permisos (UI readonly)
  if (isAdmin) {
    return (
      <input
        type="checkbox"
        checked={true}
        disabled={true}
        className="w-4 h-4 rounded border-gray-300 bg-gray-100 cursor-not-allowed"
        title="Admin siempre tiene acceso a todos los permisos"
      />
    );
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`${permiso} para ${rol}`}
    />
  );
}
