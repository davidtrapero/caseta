import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { obtenerEdicionActiva } from "@/lib/edicion";
import { contarTurnosSinPlazasAction } from "../../turnos/actions";
import { SectionHeader } from "../_components/page-header";
import { DialogoRellenarPlazas } from "./_components/DialogoRellenarPlazas";

export default async function MantenimientoPage() {
  await requireRole(["admin"]);

  const ed = await obtenerEdicionActiva();
  const contador = await contarTurnosSinPlazasAction();

  const [tiposEmpleado, casetas] = await Promise.all([
    prisma.tipoEmpleado.findMany({
      where: { activo: true },
      orderBy: [{ esVoluntario: "desc" }, { orden: "asc" }, { label: "asc" }],
      select: { id: true, label: true, esVoluntario: true },
    }),
    ed
      ? prisma.caseta.findMany({
          where: { activa: true },
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true },
        })
      : Promise.resolve([]),
  ]);

  const total = contador.ok ? contador.data.total : 0;
  const porCaseta = contador.ok ? contador.data.porCaseta : [];

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Mantenimiento"
        subtitle="Acciones puntuales sobre datos heredados o corruptos."
      />

      <section className="rounded-lg border bg-card p-6 max-w-3xl">
        <h3 className="text-base font-medium">Turnos sin plazas</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Turnos en la edición activa que no tienen ninguna plaza esperada
          (<code>TurnoPlaza</code>). Estos turnos no aparecen en el formulario
          público de voluntarios. Puedes rellenarlos con una plantilla de plazas.
        </p>

        {!ed ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No hay edición activa.
          </p>
        ) : total === 0 ? (
          <p className="mt-4 text-sm">
            No hay turnos huérfanos. Todo OK.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm">
              Hay <strong>{total}</strong> turnos sin plazas en la edición activa.
            </p>
            {porCaseta.length > 0 ? (
              <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5">
                {porCaseta.map((c) => (
                  <li key={c.casetaId}>
                    {c.casetaNombre}: {c.total} turno{c.total === 1 ? "" : "s"}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}

        <div className="mt-5">
          <DialogoRellenarPlazas
            total={total}
            porCaseta={porCaseta}
            tiposEmpleado={tiposEmpleado}
            casetas={casetas}
          />
        </div>
      </section>
    </div>
  );
}
