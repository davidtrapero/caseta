import { toggleActivoProductoAction } from "../actions";
import { Badge } from "@/components/ui/badge";

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
    <form action={toggleActivoProductoAction}>
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        disabled={disabled}
        className="group inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        title={
          disabled
            ? "Necesitas rol admin o gerente"
            : activo
              ? "Desactivar producto"
              : "Reactivar producto"
        }
      >
        <Badge variant={activo ? "active" : "inactive"}>
          {activo ? "Activo" : "Inactivo"}
        </Badge>
      </button>
    </form>
  );
}
