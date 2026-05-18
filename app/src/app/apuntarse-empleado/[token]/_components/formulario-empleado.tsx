"use client";

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

interface FormularioEmpleadoProps {
  edicionNombre: string;
  edicionAnio: number;
  dias: DiaConTurnos[];
}

export function FormularioEmpleado({
  edicionNombre,
  edicionAnio,
  dias,
}: FormularioEmpleadoProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Solicitud de turnos — {edicionNombre} ({edicionAnio})
        </h1>

        {dias.length === 0 ? (
          <div className="mt-8 rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              No hay turnos disponibles en este momento.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {dias.map((dia) => (
              <div key={dia.clave} className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {dia.titulo}
                </h2>

                <div className="space-y-3">
                  {dia.casetas.map((caseta) => (
                    <div key={caseta.nombre}>
                      <h3 className="font-medium text-gray-700">
                        {caseta.nombre}
                      </h3>
                      <div className="mt-2 space-y-2">
                        {caseta.turnos.map((turno) => (
                          <div
                            key={turno.id}
                            className="rounded border border-gray-300 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {turno.rango}
                                </p>
                              </div>
                              <div className="text-sm text-gray-600">
                                {turno.huecos} plaza{turno.huecos !== 1 ? "s" : ""}{" "}
                                disponible{turno.huecos !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
