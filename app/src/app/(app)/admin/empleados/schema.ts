import { z } from "zod";
import { dniNieOpcionalSchema } from "@/lib/validators";
import { PERFIL_ORDEN } from "../../turnos/_lib/perfiles";

const opcionalString = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional()
  );

const jornalSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce
    .number({ error: "Jornal inválido" })
    .min(0, "El jornal no puede ser negativo")
    .max(9999.99, "Jornal demasiado alto")
    .optional()
);

const perfilEmpleado = z.enum(PERFIL_ORDEN as [string, ...string[]]);

const baseEmpleado = z
  .object({
    nombre: z.string().trim().min(2, "El nombre es obligatorio").max(120),
    dni: dniNieOpcionalSchema,
    telefono: opcionalString(40),
    jornalDiario: jornalSchema,
    perfil: perfilEmpleado.default("trabajador"),
    activo: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  })
  .refine(
    (d) => (d.perfil === "voluntario") === (d.jornalDiario === undefined),
    {
      message:
        "El perfil 'Voluntario' requiere jornal vacío, y el resto requiere jornal indicado.",
      path: ["perfil"],
    }
  );

export const crearEmpleadoSchema = baseEmpleado;
export const actualizarEmpleadoSchema = baseEmpleado;

export type CrearEmpleadoInput = z.infer<typeof crearEmpleadoSchema>;
