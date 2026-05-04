// Color consistente por empleado: hash del id → HSL dentro de paleta cálida.
// Evitamos tonos azul/violeta para respetar la estética albero/tierra.

function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Rangos de tono permitidos (grados HSL):
//  - 10-45: naranjas / albero
//  - 45-60: amarillos tostados
//  - 75-110: olivas / verdes secos
//  - 355-360 / 0-10: rojos oscuros
// Los concentramos en tierra.
const BANDAS = [
  [10, 45],
  [45, 60],
  [75, 105],
  [0, 10],
];

export function colorEmpleado(empleadoId: string): {
  bg: string;
  border: string;
  text: string;
} {
  const h = hash(empleadoId);
  const banda = BANDAS[h % BANDAS.length];
  const span = banda[1] - banda[0];
  const tono = banda[0] + (h % Math.max(1, span));
  const sat = 45 + ((h >> 8) % 25); // 45..70
  const lum = 70 + ((h >> 16) % 12); // 70..82 (fondo claro)
  const lumBorde = Math.max(28, lum - 45);
  const lumTexto = 18;
  return {
    bg: `hsl(${tono} ${sat}% ${lum}%)`,
    border: `hsl(${tono} ${sat}% ${lumBorde}%)`,
    text: `hsl(${tono} ${Math.min(90, sat + 10)}% ${lumTexto}%)`,
  };
}
