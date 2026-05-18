import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularHuecosEmpleado } from "@/app/(app)/turnos/_lib/huecos-empleado";
import {
  claveDiaTurno,
  formatDiaLargoTurno,
  formatRangoTurno,
} from "@/app/(app)/turnos/_lib/fechas";
import { FormularioEmpleado } from "./_components/formulario-empleado";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ token: string }>;
}

interface DiaConTurnos {
  clave: string;
  titulo: string;
  casetas: Array<{
    nombre: string;
    turnos: Array<{
      id: string;
      rango: string;
      huecos: number;
    }>;
  }>;
}

export default async function ApuntarseEmpleadoPage({ params }: PageProps) {
  const { token } = await params;

  // 1. Validar token (mínimo 20 caracteres)
  if (!token || token.length < 20) {
    return notFound();
  }

  // 2. Buscar edición por formularioToken
  const edicion = await prisma.edicion.findUnique({
    where: { formularioToken: token },
    select: {
      id: true,
      activa: true,
      nombre: true,
      anio: true,
    },
  });

  // 3. Validar que edición existe y está activa
  if (!edicion || !edicion.activa) {
    return notFound();
  }

  // 4. Cargar todos los turnos futuros que tengan al menos 1 plaza para empleados (no voluntarios)
  const now = new Date();
  const turnos = await prisma.turno.findMany({
    where: {
      edicionId: edicion.id,
      fechaInicio: {
        gte: now,
      },
      plazas: {
        some: {
          tipoEmpleado: {
            esVoluntario: false,
          },
        },
      },
    },
    select: {
      id: true,
      fechaInicio: true,
      fechaFin: true,
      caseta: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
    orderBy: {
      fechaInicio: "asc",
    },
  });

  // 5. Si no hay turnos, retornar estructura vacía
  if (turnos.length === 0) {
    return (
      <FormularioEmpleado
        edicionNombre={edicion.nombre}
        edicionAnio={edicion.anio}
        dias={[]}
      />
    );
  }

  // 6. Calcular huecos disponibles
  const turnoIds = turnos.map((t) => t.id);
  const huecos = await calcularHuecosEmpleado(prisma, edicion.id, {
    turnoIds,
  });

  // 7. Filtrar turnos que tengan huecos > 0
  const turnosConHuecos = turnos.filter((t) => (huecos.get(t.id) ?? 0) > 0);

  // 8. Agrupar por día/caseta
  const diasMap = new Map<
    string,
    {
      fecha: Date;
      casetas: Map<
        string,
        {
          nombre: string;
          turnos: Array<{
            id: string;
            rango: string;
            huecos: number;
          }>;
        }
      >;
    }
  >();

  for (const turno of turnosConHuecos) {
    const clave = claveDiaTurno(turno.fechaInicio);
    const huecosDisponibles = huecos.get(turno.id) ?? 0;

    if (!diasMap.has(clave)) {
      diasMap.set(clave, {
        fecha: turno.fechaInicio,
        casetas: new Map(),
      });
    }

    const dia = diasMap.get(clave)!;
    if (!dia.casetas.has(turno.caseta.id)) {
      dia.casetas.set(turno.caseta.id, {
        nombre: turno.caseta.nombre,
        turnos: [],
      });
    }

    dia.casetas.get(turno.caseta.id)!.turnos.push({
      id: turno.id,
      rango: formatRangoTurno(turno.fechaInicio, turno.fechaFin),
      huecos: huecosDisponibles,
    });
  }

  // 9. Convertir Map a array ordenado para renderizar
  const diasOrdenados: DiaConTurnos[] = Array.from(diasMap.entries())
    .sort(([, a], [, b]) => a.fecha.getTime() - b.fecha.getTime())
    .map(([clave, dia]) => ({
      clave,
      titulo: formatDiaLargoTurno(dia.fecha),
      casetas: Array.from(dia.casetas.values()),
    }));

  return (
    <FormularioEmpleado
      edicionNombre={edicion.nombre}
      edicionAnio={edicion.anio}
      dias={diasOrdenados}
    />
  );
}
