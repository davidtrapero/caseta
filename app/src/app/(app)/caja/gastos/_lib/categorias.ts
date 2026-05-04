export const CATEGORIAS_GASTO = [
  "transporte",
  "material",
  "compras",
  "personal",
  "infraestructura",
  "otro",
] as const;

export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

export const CATEGORIA_LABEL: Record<CategoriaGasto, string> = {
  transporte: "Transporte",
  material: "Material",
  compras: "Compras",
  personal: "Personal",
  infraestructura: "Infraestructura",
  otro: "Otro",
};
