// Tipos serializables RSC → client component.
// Los campos de fecha viajan como string ISO para evitar problemas de hydration
// y permitir rehidratar con new Date() en cliente sin ambigüedad de zona.

import type { PerfilEmpleado } from "./_lib/perfiles";
export type { PerfilEmpleado };

export type AsignacionSerializable = {
  empleadoId: string;
  empleadoNombre: string;
  esVoluntario: boolean;
  perfil: PerfilEmpleado;
  asistio: boolean;
};

export type TurnoPlazaSerializable = {
  perfil: PerfilEmpleado;
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
  perfil: PerfilEmpleado;
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
  hoyIso: string;
  readonly: boolean;
};

// Datos para la vista SEMANA (read-only Fase 3).
export type DesglosePerfil = {
  perfil: PerfilEmpleado;
  asignados: number;
  plazas: number; // 0 si no hay TurnoPlaza para ese perfil
};

export type ResumenDiaSemana = {
  fecha: string; // YYYY-MM-DD
  numTurnos: number;
  numPersonas: number; // empleados distintos asignados ese día
  desglose: DesglosePerfil[]; // solo perfiles con asignados>0 o plazas>0
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
  hoyIso: string;
  readonly: boolean;
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
