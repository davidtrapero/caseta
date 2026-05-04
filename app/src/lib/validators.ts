import { z } from "zod";

const LETRAS_DNI = "TRWAGMYFPDXBNJZSQVHLCKE";

function esDniValido(valor: string): boolean {
  const match = /^(\d{8})([A-Z])$/.exec(valor);
  if (!match) return false;
  const [, numero, letra] = match;
  return LETRAS_DNI[Number.parseInt(numero, 10) % 23] === letra;
}

function esNieValido(valor: string): boolean {
  const match = /^([XYZ])(\d{7})([A-Z])$/.exec(valor);
  if (!match) return false;
  const [, prefijo, numero, letra] = match;
  const mapa: Record<string, string> = { X: "0", Y: "1", Z: "2" };
  const normalizado = mapa[prefijo] + numero;
  return LETRAS_DNI[Number.parseInt(normalizado, 10) % 23] === letra;
}

export const dniNieSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (v) => esDniValido(v) || esNieValido(v),
    "DNI/NIE inválido (formato esperado: 12345678A o X1234567A, con letra de control correcta)"
  );

export const dniNieOpcionalSchema = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    dniNieSchema.optional()
  );
