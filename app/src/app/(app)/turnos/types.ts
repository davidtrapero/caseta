// Tipos serializables RSC → client component.
// Los campos de fecha viajan como string ISO para evitar problemas de hydration
// y permitir rehidratar con new Date() en cliente sin ambigüedad de zona.

import type { TipoEmpleadoLite } from "./_lib/perfiles";
export type { TipoEmpleadoLite };

export type AsignacionSerializable = {
  empleadoId: string;
  empleadoNombre: string;
  esVoluntario: boolean;
  tipoEmpleadoId: string;
  asistio: boolean;
};

export type TurnoPlazaSerializable = {
  tipoEmpleadoId: string;
  cantidad: number;
};

export type TurnoSerializable = {
  id: string;
  edicionId: string;
  casetaId: string;
  fechaInicio: string; // ISO 8601
  fechaFin: string; // ISO 8601
  asignaciones: AsignacionSerializable[];
  plazas: TurnoPlazaSerializable[];
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
  tipoEmpleadoId: string;
};

export type EdicionMin = {
  id: string;
  anio: number;
  nombre: string;
  activa: boolean;
  fechaInicio: string;
  fechaFin: string;
};

// Datos para la vista DÍA (vista principal Fase 3).
export type DiaTurnos = {
  edicion: EdicionMin;
  edicionesDisponibles: EdicionMin[];
  casetaSeleccionada: CasetaMin;
  casetas: CasetaMin[];
  fecha: string; // YYYY-MM-DD
  fechaAnterior: string; // YYYY-MM-DD (para duplicar día anterior)
  turnos: TurnoSerializable[];
  empleados: EmpleadoMin[];
  tiposEmpleado: TipoEmpleadoLite[];
  hoyIso: string;
  readonly: boolean;
};

// Datos para la vista SEMANA (read-only Fase 3).
export type DesglosePerfil = {
  tipoEmpleadoId: string;
  asignados: number;
  plazas: number; // 0 si no hay TurnoPlaza para ese tipo
};

export type ResumenDiaSemana = {
  fecha: string; // YYYY-MM-DD
  numTurnos: number;
  numPersonas: number; // empleados distintos asignados ese día
  desglose: DesglosePerfil[]; // solo tipos con asignados>0 o plazas>0
  turnos: TurnoSerializable[]; // turnos del día ordenados por fechaInicio
};

export type SemanaTurnos = {
  edicion: EdicionMin;
  edicionesDisponibles: EdicionMin[];
  casetaSeleccionada: CasetaMin;
  casetas: CasetaMin[];
  lunes: string;
  domingo: string;
  dias: ResumenDiaSemana[];
  turnos: TurnoSerializable[]; // todos los de la semana, por si imprimir los necesita
  empleados: EmpleadoMin[];
  tiposEmpleado: TipoEmpleadoLite[];
  hoyIso: string;
  readonly: boolean;
};

// --- Export views ---

export type VacanteTurno = {
  tipoEmpleadoId: string;
  faltan: number;
};

export type ResumenVacantes = {
  totalFaltan: number;
  porTipo: Array<{ tipoEmpleadoId: string; faltan: number }>;
};

export type SemanaGlobalCelda = {
  fecha: string;
  numTurnos: number;
  numPersonas: number;
  totalVacantes: number;
  turnos: TurnoSerializable[]; // turnos del día en esa caseta, ordenados por fechaInicio
};

export type SemanaGlobalCaseta = {
  caseta: CasetaMin;
  dias: SemanaGlobalCelda[];
};

export type SemanaGlobal = {
  edicion: EdicionMin;
  lunes: string;
  domingo: string;
  filas: SemanaGlobalCaseta[];
  tiposEmpleado: TipoEmpleadoLite[];
  hoyIso: string;
};

export type TurnoEmpleadoExport = {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  caseta: CasetaMin;
  asistio: boolean;
};

export type TurnosEmpleado = {
  edicion: EdicionMin;
  empleado: EmpleadoMin & { tipoEmpleado: TipoEmpleadoLite | null };
  desde: string;
  hasta: string;
  turnos: TurnoEmpleadoExport[];
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
