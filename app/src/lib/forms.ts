/**
 * Helper para serializar FormData a objeto plano.
 * Sigue las reglas del formulario caseta:
 * - Agrupa multivalor (checkboxes con mismo name) en arrays
 * - Excluye blacklist: password, passwordConfirm, token
 * - Excluye File instances
 * - Excluye campos con prefix "_" (campos técnicos ocultos que parseForm filtra)
 * - Convierte string vacío a undefined
 */
export function formDataToObject(
  formData: FormData,
  options?: {
    /** Campos adicionales a excluir además de la blacklist default */
    excludeFields?: string[];
  }
): Record<string, unknown> {
  const blacklist = new Set([
    "password",
    "passwordConfirm",
    "passwordNueva",
    "passwordNuevaConfirm",
    "passwordActual",
    "token",
  ]);

  if (options?.excludeFields) {
    options.excludeFields.forEach((f) => blacklist.add(f));
  }

  const result: Record<string, unknown> = {};
  const seen = new Set<string>();

  for (const [key, value] of formData.entries()) {
    // Evita procesar campos ya vistos (solo la primera ocurrencia de cada key)
    if (seen.has(key)) continue;
    seen.add(key);

    // Filtrar: blacklist
    if (blacklist.has(key)) continue;

    // Filtrar: campos técnicos con prefix "_" (parseForm los filtra)
    if (key.startsWith("_")) continue;

    // Obtener todos los valores para este key
    const values = formData
      .getAll(key)
      .filter((v): v is string => !(v instanceof File))
      .map((v) => (v === "" ? undefined : v))
      .filter((v) => v !== undefined);

    // Si hay multivalor, guardar como array; si uno, guardar directamente
    if (values.length === 0) {
      // Campo vacío: no incluir
      continue;
    } else if (values.length === 1) {
      result[key] = values[0];
    } else {
      result[key] = values;
    }
  }

  return result;
}
