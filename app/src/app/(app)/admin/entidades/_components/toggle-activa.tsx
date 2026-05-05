import { Badge } from "@/components/ui/badge";
import { desactivarEntidadAction, reactivarEntidadAction } from "../actions";

export function ToggleActivaEntidadForm({
  id,
  activa,
}: {
  id: string;
  activa: boolean;
}) {
  const action = activa ? desactivarEntidadAction : reactivarEntidadAction;
  return (
    <form action={action}>
      <input type="hidden" name="_id" value={id} />
      <button
        type="submit"
        className="group inline-flex items-center gap-2"
        title={activa ? "Marcar como inactiva (no aparece en formularios públicos)" : "Reactivar entidad"}
      >
        <Badge variant={activa ? "active" : "inactive"}>
          {activa ? "Activa" : "Inactiva"}
        </Badge>
      </button>
    </form>
  );
}
