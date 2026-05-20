"use client";

import { ToggleEstadoForm } from "@/components/forms/toggle-estado-form";
import { desactivarEntidadAction, reactivarEntidadAction } from "../actions";

export function ToggleActivaEntidadForm({
  id,
  activa,
}: {
  id: string;
  activa: boolean;
}) {
  return (
    <ToggleEstadoForm
      id={id}
      activo={activa}
      action={{
        whenActive: desactivarEntidadAction,
        whenInactive: reactivarEntidadAction,
      }}
      labels={{ activo: "Activa", inactivo: "Inactiva" }}
      titles={{
        whenActive: "Marcar como inactiva (no aparece en formularios públicos)",
        whenInactive: "Reactivar entidad",
      }}
    />
  );
}
