"use client";

import { ToggleEstadoForm } from "@/components/forms/toggle-estado-form";
import { desactivarUsuarioAction, reactivarUsuarioAction } from "../actions";

export function ToggleActivoUsuarioForm({
  id,
  activo,
  disabled,
  esSelf,
}: {
  id: string;
  activo: boolean;
  disabled?: boolean;
  esSelf?: boolean;
}) {
  return (
    <ToggleEstadoForm
      id={id}
      activo={activo}
      disabled={disabled || esSelf}
      action={{
        whenActive: desactivarUsuarioAction,
        whenInactive: reactivarUsuarioAction,
      }}
      labels={{ activo: "Activo", inactivo: "Inactivo" }}
      titles={{
        disabled: esSelf
          ? "No puedes desactivarte a ti misma"
          : "Solo la administración puede cambiar este estado",
        whenActive: "Desactivar cuenta",
        whenInactive: "Reactivar cuenta",
      }}
    />
  );
}
