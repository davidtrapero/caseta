// Tipos serializables RSC → client component.
// Los campos de fecha viajan como string ISO para evitar problemas de hydration
// y permitir rehidratar con new Date() en cliente sin ambigüedad de zona.

export type TurnoSerializable = {
  id: string;
  edicionId: string;
  casetaId: string;
  empleadoId: string;
  empleadoNombre: string;
  fechaInicio: string; // ISO 8601
  fechaFin: string; // ISO 8601
  asistio: boolean;
};

export type CasetaMin = {
  id: string;
  nombre: string;
  activa: boolean;
};

export type EmpleadoMin = {
  id: string;
  nombre: string;
  activo: boolean;
  esVoluntario: boolean; // jornalDiario === null
};

export type EdicionMin = {
  id: string;
  anio: number;
  nombre: string;
  activa: boolean;
  fechaInicio: string;
  fechaFin: string;
};

// Datos que recibe el RSC de /turnos para pintar la semana.
export type SemanaTurnos = {
  edicion: EdicionMin;
  edicionesDisponibles: EdicionMin[];
  casetaSeleccionada: CasetaMin;
  casetas: CasetaMin[];
  lunes: string; // YYYY-MM-DD
  domingo: string; // YYYY-MM-DD
  turnos: TurnoSerializable[];
  empleados: EmpleadoMin[]; // activos, para el selector "añadir empleado"
  hoyIso: string; // YYYY-MM-DD — referencia server-side para habilitar/deshabilitar toggle asistencia
  readonly: boolean; // true si edición no activa o caseta inactiva
};

// Resultado tipado de la detección de solape.
export type ResultadoSolape =
  | { solapa: false }
  | {
      solapa: true;
      conflictos: Array<{
        turnoId: string;
        empleadoId: string;
        casetaId: string;
        fechaInicio: string;
        fechaFin: string;
      }>;
    };
