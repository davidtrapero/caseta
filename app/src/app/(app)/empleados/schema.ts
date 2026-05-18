import { z } from "zod";

const opcionalString = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional()
  );

// Email opcional. La regla "obligatorio si voluntario" no aplica:
// se acepta vacío en cualquier caso. Sólo validamos formato.
const emailOpcional = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().toLowerCase().email("Email inválido").max(120).optional()
);

const jornalSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce
    .number({ error: "Jornal inválido" })
    .min(0, "El jornal no puede ser negativo.")
    .max(9999.99, "Jornal demasiado alto")
    .optional()
);

// Tipos de empleado: array de ids de la tabla TipoEmpleado. La regla
// "voluntario ⇒ jornal NULL + entidad NOT NULL" se valida en la action.
// DNI: sólo opcional en Zod (sin validación de formato aquí). La regla
// "obligatorio si no voluntario" se evalúa en la action.
const baseEmpleado = z.object({
  nombre: z.string().trim().min(2, "Completa el nombre").max(120),
  dni: opcionalString(20),
  email: emailOpcional,
  telefono: opcionalString(40),
  jornalDiario: jornalSchema,
  entidadId: opcionalString(40),
  tipoIds: z.preprocess(
    (v) => (Array.isArray(v) ? v : typeof v === "string" ? [v] : []),
    z.array(z.string().min(1)).min(1, "Selecciona al menos un tipo")
  ),
  esVoluntario: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  activo: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export const crearEmpleadoSchema = baseEmpleado;
export const actualizarEmpleadoSchema = baseEmpleado;

export type CrearEmpleadoInput = z.infer<typeof crearEmpleadoSchema>;
