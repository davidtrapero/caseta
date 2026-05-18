import { toggleActivaAction } from "../actions";
import { Badge } from "@/components/ui/badge";

export function ToggleActivaForm({
  id,
  activa,
  disabled,
}: {
  id: string;
  activa: boolean;
  disabled?: boolean;
}) {
  return (
    <form action={toggleActivaAction}>
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        disabled={disabled}
        className="group inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        title={
          disabled
            ? "Solo la administración puede cambiar este estado"
            : activa
              ? "Marcar como inactiva"
              : "Marcar como activa"
        }
      >
        <Badge variant={activa ? "active" : "inactive"}>
          {activa ? "Activa" : "Inactiva"}
        </Badge>
      </button>
    </form>
  );
}
