"use client";

import { ToggleEstadoForm } from "@/components/forms/toggle-estado-form";
import { toggleActivoEmpleadoAction } from "../actions";

export function ToggleActivoEmpleadoForm({
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
      action={toggleActivoEmpleadoAction}
      labels={{ activo: "Activo", inactivo: "Inactivo" }}
      titles={{
        disabled: "Necesitas rol admin o gerente para cambiar este estado",
        whenActive: "Marcar como inactivo",
        whenInactive: "Marcar como activo",
      }}
    />
  );
}
