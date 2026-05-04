import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader, EmptyState } from "../_components/page-header";
import { ToggleActivoEmpleadoForm } from "./_components/toggle-activo";
import {
  PERFIL_LABEL,
  PERFIL_COLORES,
  type PerfilEmpleado,
} from "../../turnos/_lib/perfiles";

const FORMATO_EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export default async function EmpleadosPage() {
  const { user } = await requireRole(["admin", "gerente", "cajero"]);
  const puedeEditar = user.rol === "admin" || user.rol === "gerente";

  const empleados = await prisma.empleado.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });

  return (
    <div>
      <SectionHeader
        title="Empleados"
        subtitle="Personal disponible para turnos. Los voluntarios no cobran jornal."
        actionHref="/admin/empleados/nuevo"
        actionLabel="Nuevo empleado"
        canAct={puedeEditar}
      />

      {empleados.length === 0 ? (
        <EmptyState
          title="Sin empleados registrados"
          description="Registra empleados para poder asignarles turnos y calcular nóminas."
          actionHref={puedeEditar ? "/admin/empleados/nuevo" : undefined}
          actionLabel={puedeEditar ? "Crear empleado" : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-28">Perfil</TableHead>
              <TableHead className="w-32">DNI/NIE</TableHead>
              <TableHead className="w-40">Teléfono</TableHead>
              <TableHead className="w-40">Jornal</TableHead>
              <TableHead className="w-32">Estado</TableHead>
              <TableHead className="w-28 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empleados.map((e) => {
              const jornal = e.jornalDiario ? Number(e.jornalDiario) : null;
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nombre}</TableCell>
                  <TableCell>
                    {(() => {
                      const p = e.perfil as PerfilEmpleado;
                      const colores = PERFIL_COLORES[p];
                      return (
                        <span
                          className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                          style={{ background: colores.bg, color: colores.text, border: `1px solid ${colores.border}` }}
                        >
                          {PERFIL_LABEL[p]}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {e.dni ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.telefono ?? "—"}
                  </TableCell>
                  <TableCell>
                    {jornal === null ? (
                      <Badge variant="outline">Voluntario</Badge>
                    ) : (
                      <span className="font-mono text-sm">
                        {FORMATO_EUR.format(jornal)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ToggleActivoEmpleadoForm
                      id={e.id}
                      activo={e.activo}
                      disabled={!puedeEditar}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {puedeEditar ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/empleados/${e.id}`}>Editar</Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Solo lectura</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
