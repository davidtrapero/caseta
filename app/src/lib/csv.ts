/**
 * Helpers RFC 4180 con separador `;` (Excel ES) y BOM UTF-8 inicial.
 */

export const SEPARADOR = ";";
export const BOM = "﻿";

const NECESITA_ESCAPE = /[";\r\n]/;

export function escaparCelda(valor: string): string {
  if (NECESITA_ESCAPE.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export function toCsvRow(values: string[]): string {
  return values.map(escaparCelda).join(SEPARADOR);
}
