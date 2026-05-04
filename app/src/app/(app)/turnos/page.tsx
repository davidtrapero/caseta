import { requireRole } from "@/lib/authz";
import { loadDiaTurnos } from "./_lib/loader";
import { CalendarioDia } from "./_components/CalendarioDia";
import { SelectorCaseta } from "./_components/SelectorCaseta";
import { NavegadorFecha } from "./_components/NavegadorFecha";
import { EmptyState } from "../admin/_components/page-header";

type SP = Promise<{ fecha?: string; casetaId?: string }>;

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const sp = await searchParams;
  const puedeEditar = user.rol === "admin" || user.rol === "gerente";

  const dia = await loadDiaTurnos({
    fecha: sp.fecha,
    casetaId: sp.casetaId,
    readonly: !puedeEditar,
  });

  if (!dia) {
    return (
      <div>
        <h1 className="text-2xl mb-2">Turnos</h1>
        <EmptyState
          title="Faltan datos base"
          description="Necesitas al menos una edición y una caseta activa."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <header className="flex flex-col gap-3 border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Turnos · {dia.edicion.nombre}
            </div>
            <h1 className="text-2xl font-[var(--font-display)] mt-1">
              {dia.casetaSeleccionada.nombre}
            </h1>
          </div>
          <SelectorCaseta
            casetas={dia.casetas}
            casetaId={dia.casetaSeleccionada.id}
          />
        </div>
        <NavegadorFecha fecha={dia.fecha} />
      </header>

      <CalendarioDia dia={dia} puedeEditar={puedeEditar} />
    </div>
  );
}
