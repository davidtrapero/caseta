// Builders de datos de test. Encapsulan las invariantes del dominio
// (p.ej. voluntario ⇔ jornalDiario=null) para que los tests no las
// violen accidentalmente al crear entidades con prisma.*.create crudo.
//
// seedMinimal() deja la BD con: 1 edición activa, 1 caseta, 1 proveedor,
// 3 usuarios (admin/gerente/cajero) con passwords conocidos.
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Prisma, Rol, PerfilEmpleado } from "@prisma/client";

export const TEST_PASSWORD = "test1234!";

// ------------------------------------------------------------
// Usuarios
// ------------------------------------------------------------

export async function crearUsuario(params: {
  email: string;
  name: string;
  rol: Rol;
  activo?: boolean;
  password?: string;
}): Promise<{ id: string; email: string; rol: Rol }> {
  const result = await auth.api.signUpEmail({
    body: {
      email: params.email,
      password: params.password ?? TEST_PASSWORD,
      name: params.name,
    },
  });
  if (!result.user) throw new Error(`No se pudo crear usuario ${params.email}`);

  const updated = await prisma.user.update({
    where: { id: result.user.id },
    data: { rol: params.rol, activo: params.activo ?? true },
    select: { id: true, email: true, rol: true },
  });
  return updated;
}

// ------------------------------------------------------------
// Edición
// ------------------------------------------------------------

export async function crearEdicion(params?: {
  anio?: number;
  nombre?: string;
  activa?: boolean;
  fechaInicio?: Date;
  fechaFin?: Date;
}) {
  const anio = params?.anio ?? 2026;
  return prisma.edicion.create({
    data: {
      anio,
      nombre: params?.nombre ?? `San Isidro ${anio}`,
      fechaInicio: params?.fechaInicio ?? new Date(`${anio}-05-01`),
      fechaFin: params?.fechaFin ?? new Date(`${anio}-05-10`),
      activa: params?.activa ?? true,
    },
  });
}

// ------------------------------------------------------------
// Caseta
// ------------------------------------------------------------

export async function crearCaseta(params?: {
  nombre?: string;
  ubicacion?: string;
  activa?: boolean;
}) {
  return prisma.caseta.create({
    data: {
      nombre: params?.nombre ?? "Caseta Test",
      ubicacion: params?.ubicacion,
      activa: params?.activa ?? true,
    },
  });
}

// ------------------------------------------------------------
// Empleado
// ------------------------------------------------------------

export async function crearEmpleado(params: {
  nombre: string;
  dni?: string | null;
  telefono?: string | null;
  perfil?: PerfilEmpleado;
  jornalDiario?: number | null;
  activo?: boolean;
}) {
  const perfil = params.perfil ?? "trabajador";
  // Invariante: voluntario ⇔ jornalDiario null.
  const jornal =
    perfil === "voluntario"
      ? null
      : (params.jornalDiario ?? 70);

  return prisma.empleado.create({
    data: {
      nombre: params.nombre,
      dni: params.dni ?? null,
      telefono: params.telefono ?? null,
      perfil,
      jornalDiario: jornal,
      activo: params.activo ?? true,
    },
  });
}

// ------------------------------------------------------------
// Proveedor
// ------------------------------------------------------------

export async function crearProveedor(params?: {
  nombre?: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
}) {
  return prisma.proveedor.create({
    data: {
      nombre: params?.nombre ?? "Proveedor Test",
      email: params?.email,
      telefono: params?.telefono,
      activo: params?.activo ?? true,
    },
  });
}

// ------------------------------------------------------------
// Producto
// ------------------------------------------------------------

export async function crearProducto(params: {
  casetaId: string;
  nombre: string;
  unidad?: string;
  activo?: boolean;
}) {
  return prisma.producto.create({
    data: {
      casetaId: params.casetaId,
      nombre: params.nombre,
      unidad: params.unidad ?? "unidad",
      activo: params.activo ?? true,
    },
  });
}

// ------------------------------------------------------------
// Turno + asignaciones
// ------------------------------------------------------------

export async function crearTurno(params: {
  edicionId: string;
  casetaId: string;
  fechaInicio: Date;
  fechaFin: Date;
  empleadoIds?: string[];
}) {
  return prisma.turno.create({
    data: {
      edicionId: params.edicionId,
      casetaId: params.casetaId,
      fechaInicio: params.fechaInicio,
      fechaFin: params.fechaFin,
      asignaciones: params.empleadoIds
        ? {
            create: params.empleadoIds.map((empleadoId) => ({ empleadoId })),
          }
        : undefined,
    },
    include: { asignaciones: true },
  });
}

// ------------------------------------------------------------
// Cierre diario
// ------------------------------------------------------------

export async function crearCierre(params: {
  edicionId: string;
  casetaId: string;
  fecha: Date;
  ingresosTotales: number;
  notas?: string;
}) {
  return prisma.cierreDiario.create({
    data: {
      edicionId: params.edicionId,
      casetaId: params.casetaId,
      fecha: params.fecha,
      ingresosTotales: params.ingresosTotales,
      notas: params.notas,
    },
  });
}

// ------------------------------------------------------------
// Seed mínimo
// ------------------------------------------------------------

export type MinimalSeed = {
  edicion: Awaited<ReturnType<typeof crearEdicion>>;
  caseta: Awaited<ReturnType<typeof crearCaseta>>;
  proveedor: Awaited<ReturnType<typeof crearProveedor>>;
  admin: { id: string; email: string; rol: Rol };
  gerente: { id: string; email: string; rol: Rol };
  cajero: { id: string; email: string; rol: Rol };
};

export async function seedMinimal(): Promise<MinimalSeed> {
  const [admin, gerente, cajero, edicion, caseta, proveedor] = await Promise.all([
    crearUsuario({ email: "admin@caseta.test", name: "Admin Test", rol: "admin" }),
    crearUsuario({ email: "gerente@caseta.test", name: "Gerente Test", rol: "gerente" }),
    crearUsuario({ email: "cajero@caseta.test", name: "Cajero Test", rol: "cajero" }),
    crearEdicion(),
    crearCaseta(),
    crearProveedor(),
  ]);

  return { admin, gerente, cajero, edicion, caseta, proveedor };
}
