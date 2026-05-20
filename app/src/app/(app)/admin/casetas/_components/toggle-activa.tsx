"use client";

import { ToggleEstadoForm } from "@/components/forms/toggle-estado-form";
import { toggleActivaCasetaAction } from "../actions";

export function ToggleActivaCasetaForm({
  id,
  activa,
  disabled,
}: {
  id: string;
  activa: boolean;
  disabled?: boolean;
}) {
  return (
    <ToggleEstadoForm
      id={id}
      activo={activa}
      disabled={disabled}
      action={toggleActivaCasetaAction}
      labels={{ activo: "Activa", inactivo: "Inactiva" }}
      titles={{
        disabled: "Necesitas rol admin o gerente para cambiar este estado",
        whenActive: "Marcar como inactiva",
        whenInactive: "Marcar como activa",
      }}
    />
  );
}
