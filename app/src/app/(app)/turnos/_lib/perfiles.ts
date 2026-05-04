// Perfiles operativos de empleado. Fuente de verdad para orden, labels y colores.
// El orden aquí define el orden de agrupación en todas las vistas de turnos.

export type PerfilEmpleado =
  | "vigilante"
  | "coordinador"
  | "trabajador"
  | "voluntario"
  | "ayudante";

export const PERFIL_ORDEN: PerfilEmpleado[] = [
  "vigilante",
  "coordinador",
  "trabajador",
  "voluntario",
  "ayudante",
];

export const PERFIL_LABEL: Record<PerfilEmpleado, string> = {
  vigilante: "Vigilante",
  coordinador: "Coordinador",
  trabajador: "Trabajador",
  voluntario: "Voluntario",
  ayudante: "Ayudante",
};

export const PERFIL_LABEL_CORTO: Record<PerfilEmpleado, string> = {
  vigilante: "Vig",
  coordinador: "Coor",
  trabajador: "Trab",
  voluntario: "Vol",
  ayudante: "Ay",
};

// Paleta cálida por perfil. Diseñada sobre la escala albero/tierra del proyecto.
// vigilante: granate — autoridad
// coordinador: latón oscuro — mando
// trabajador: albero — base
// voluntario: oliva — apoyo
// ayudante: arena — complemento
export const PERFIL_COLORES: Record<
  PerfilEmpleado,
  { bg: string; border: string; text: string }
> = {
  vigilante: {
    bg: "hsl(3 40% 82%)",
    border: "hsl(3 52% 38%)",
    text: "hsl(3 60% 16%)",
  },
  coordinador: {
    bg: "hsl(33 45% 78%)",
    border: "hsl(33 55% 35%)",
    text: "hsl(33 60% 14%)",
  },
  trabajador: {
    bg: "hsl(33 55% 88%)",
    border: "hsl(33 57% 50%)",
    text: "hsl(33 60% 18%)",
  },
  voluntario: {
    bg: "hsl(78 30% 82%)",
    border: "hsl(78 38% 40%)",
    text: "hsl(78 40% 15%)",
  },
  ayudante: {
    bg: "hsl(38 38% 90%)",
    border: "hsl(38 30% 55%)",
    text: "hsl(38 35% 20%)",
  },
};
