"use client";

import { ToggleEstadoForm } from "@/components/forms/toggle-estado-form";
import { toggleActivoProductoAction } from "../actions";

export function ToggleActivoProductoForm({
  id,
  activo,
  disabled,
}: {
  id: string;
  activo: boolean;
  disabled?: boolean;
}) {
  return (
    <ToggleEstadoForm
      id={id}
      activo={activo}
      disabled={disabled}
      action={toggleActivoProductoAction}
      labels={{ activo: "Activo", inactivo: "Inactivo" }}
      titles={{
        disabled: "Necesitas rol admin o gerente",
        whenActive: "Desactivar producto",
        whenInactive: "Reactivar producto",
      }}
    />
  );
}
