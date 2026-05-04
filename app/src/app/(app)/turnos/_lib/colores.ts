// Paleta cálida derivada del tema "cuero y latón". Asignación determinista
// por empleadoId (hash) para que un mismo empleado mantenga color entre sesiones.

// Tonos HSL en sintonía con la paleta base (rojo albero, latón, oliva, tierra).
const PALETA: Array<{ bg: string; border: string; fg: string }> = [
  { bg: "33 57% 50%", border: "33 57% 38%", fg: "40 48% 97%" },   // latón
  { bg: "12 55% 42%", border: "12 55% 30%", fg: "40 48% 97%" },   // rojo albero
  { bg: "72 28% 38%", border: "72 28% 28%", fg: "40 48% 97%" },   // oliva
  { bg: "25 60% 35%", border: "25 60% 25%", fg: "40 48% 97%" },   // tierra oscura
  { bg: "200 35% 38%", border: "200 35% 28%", fg: "40 48% 97%" }, // azul noche desaturado
  { bg: "3 60% 30%", border: "3 60% 22%", fg: "40 48% 97%" },     // granate
  { bg: "42 65% 45%", border: "42 65% 33%", fg: "30 22% 8%" },    // dorado
  { bg: "145 22% 32%", border: "145 22% 22%", fg: "40 48% 97%" }, // verde bosque
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function coloresEmpleado(empleadoId: string) {
  const c = PALETA[hash(empleadoId) % PALETA.length];
  return {
    backgroundColor: `hsl(${c.bg})`,
    borderColor: `hsl(${c.border})`,
    color: `hsl(${c.fg})`,
  };
}
