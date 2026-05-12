import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularHuecosVoluntario } from "@/app/(app)/turnos/_lib/huecos";
import {
  claveDiaTurno,
  formatDiaLargoTurno,
  formatRangoTurno,
} from "@/app/(app)/turnos/_lib/fechas";
import { FormularioVoluntario } from "./_components/formulario-voluntario";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ApuntarsePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 20) notFound();

  const edicion = await prisma.edicion.findUnique({
    where: { formularioToken: token },
    select: { id: true, activa: true, nombre: true, anio: true },
  });
  if (!edicion || !edicion.activa) notFound();

  const ahora = new Date();

  const [turnos, entidades, huecos] = await Promise.all([
    prisma.turno.findMany({
      where: {
        edicionId: edicion.id,
        fechaInicio: { gte: ahora },
        plazas: {
          some: {
            tipoEmpleado: { esVoluntario: true },
            cantidad: { gt: 0 },
          },
        },
      },
      select: {
        id: true,
        fechaInicio: true,
        fechaFin: true,
        caseta: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaInicio: "asc" },
    }),
    prisma.entidadVoluntario.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    calcularHuecosVoluntario(prisma, edicion.id),
  ]);

  const turnosDisponibles = turnos.filter((t) => (huecos.get(t.id) ?? 0) > 0);

  const grupos = new Map<
    string,
    {
      fecha: Date;
      casetas: Map<
        string,
        { casetaNombre: string; turnos: typeof turnosDisponibles }
      >;
    }
  >();
  for (const t of turnosDisponibles) {
    const k = claveDiaTurno(t.fechaInicio);
    if (!grupos.has(k)) grupos.set(k, { fecha: t.fechaInicio, casetas: new Map() });
    const grupo = grupos.get(k)!;
    if (!grupo.casetas.has(t.caseta.id)) {
      grupo.casetas.set(t.caseta.id, {
        casetaNombre: t.caseta.nombre,
        turnos: [],
      });
    }
    grupo.casetas.get(t.caseta.id)!.turnos.push(t);
  }

  const dias = Array.from(grupos.entries()).map(([clave, grupo]) => ({
    clave,
    fecha: grupo.fecha,
    casetas: Array.from(grupo.casetas.values()),
  }));

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Apuntarse como voluntario</h1>
          <p className="text-muted-foreground mt-1">
            {edicion.nombre} · {edicion.anio}
          </p>
        </header>

        {dias.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-base">No hay turnos disponibles ahora mismo.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Vuelve a abrir el enlace cuando se publiquen nuevos turnos.
            </p>
          </div>
        ) : (
          <FormularioVoluntario
            token={token}
            entidades={entidades}
            dias={dias.map((d) => ({
              clave: d.clave,
              titulo: formatDiaLargoTurno(d.fecha),
              casetas: d.casetas.map((c) => ({
                nombre: c.casetaNombre,
                turnos: c.turnos.map((t) => ({
                  id: t.id,
                  rango: formatRangoTurno(t.fechaInicio, t.fechaFin),
                  huecos: huecos.get(t.id) ?? 0,
                })),
              })),
            }))}
          />
        )}
      </div>
    </main>
  );
}
