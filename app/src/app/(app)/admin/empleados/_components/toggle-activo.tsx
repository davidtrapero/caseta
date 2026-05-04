import { toggleActivoEmpleadoAction } from "../actions";
import { Badge } from "@/components/ui/badge";

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
    <form action={toggleActivoEmpleadoAction}>
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        disabled={disabled}
        className="group inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        title={
          disabled
            ? "Necesitas rol admin o gerente para cambiar este estado"
            : activo
              ? "Marcar como inactivo"
              : "Marcar como activo"
        }
      >
        <Badge variant={activo ? "active" : "inactive"}>
          {activo ? "Activo" : "Inactivo"}
        </Badge>
      </button>
    </form>
  );
}
