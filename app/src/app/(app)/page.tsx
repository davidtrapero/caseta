import { getSession } from "@/lib/authz";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Rol } from "@prisma/client";
import { loadDashboard } from "./_lib/dashboard";
import { KpiCard } from "./_components/kpi-card";
import { TurnosHoy } from "./_components/turnos-hoy";
import { AlertasPanel } from "./_components/alertas-panel";
import { ActividadFeed } from "./_components/actividad-feed";
import { EmptyState } from "./admin/_components/page-header";
import { hoyIso, fromYmd } from "./turnos/_lib/fechas";

const FECHA_LARGA = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatFechaLarga(ymd: string): string {
  const d = fromYmd(ymd);
  const s = FECHA_LARGA.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function InicioPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user = session.user as typeof session.user & { rol: Rol };
  const rol = user.rol;
  const esAdminOGerente = rol === "admin" || rol === "gerente";

  const data = await loadDashboard(rol);

  const fechaHoy = formatFechaLarga(hoyIso());

  if (!data.edicion) {
    return (
      <div>
        <h2 className="text-xl mb-1">Inicio</h2>
        <p className="text-sm text-muted-foreground mb-6">{fechaHoy}</p>
        <EmptyState
          title="Sin edición activa"
          description="Activa una edición desde administración para empezar."
          actionHref="/admin"
          actionLabel="Ir a administración"
        />
      </div>
    );
  }

  const { kpis, operativo, turnosHoy, alertas, actividad } = data;

  return (
    <div className="max-w-5xl space-y-8">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-medium">{data.edicion.nombre}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{fechaHoy}</p>
      </div>

      {/* KPI row */}
      {kpis && (
        <section>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <KpiCard
              etiqueta="Ingresos · edición"
              valor={kpis.ingresosEdicion}
              nota="Acumulado"
              tono="positivo"
            />
            {esAdminOGerente && (
              <>
                <KpiCard
                  etiqueta="Gastos · edición"
                  valor={kpis.gastosEdicion}
                  nota="Acumulado"
                  tono="negativo"
                />
                <KpiCard
                  etiqueta="Neto · edición"
                  valor={kpis.resultadoNeto}
                  nota="Ingresos − gastos"
                  tono={kpis.resultadoNeto >= 0 ? "neto-positivo" : "neto-negativo"}
                />
              </>
            )}
          </div>
        </section>
      )}

      {/* Cards operativas */}
      {operativo && esAdminOGerente && (
        <section>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Cobertura de turnos */}
            <div
              className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4 flex flex-col gap-2"
              style={{ boxShadow: "var(--surface-glass-shadow)" }}
            >
              <p className="text-[10px] font-medium uppercase tracking-widest text-primary">
                Cobertura · turnos
              </p>
              <p className="font-mono text-2xl font-semibold tabular-nums leading-none">
                {operativo.plazasOcupadas}
                <span className="text-muted-foreground text-base font-normal">
                  {" "}/ {operativo.plazasEsperadas}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">asignadas</p>
              {operativo.plazasEsperadas > 0 && (
                <div
                  className="h-1.5 w-full rounded-full overflow-hidden mt-1"
                  style={{ backgroundColor: "hsl(var(--border))" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((operativo.plazasOcupadas / operativo.plazasEsperadas) * 100))}%`,
                      backgroundColor:
                        operativo.plazasOcupadas >= operativo.plazasEsperadas
                          ? "hsl(var(--accent))"
                          : "hsl(var(--primary))",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Voluntarios */}
            <div
              className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4 flex flex-col gap-2"
              style={{ boxShadow: "var(--surface-glass-shadow)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-widest text-primary">
                  Voluntarios
                </p>
                {operativo.voluntariosPendientes > 0 && (
                  <Link
                    href="/admin/solicitudes"
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: "hsl(var(--destructive) / 0.15)",
                      color: "hsl(var(--destructive))",
                    }}
                  >
                    {operativo.voluntariosPendientes} pendiente{operativo.voluntariosPendientes !== 1 ? "s" : ""}
                  </Link>
                )}
              </div>
              <p className="font-mono text-2xl font-semibold tabular-nums leading-none">
                {operativo.voluntariosAprobados}
              </p>
              <p className="text-xs text-muted-foreground">
                aprobado{operativo.voluntariosAprobados !== 1 ? "s" : ""}
                {operativo.voluntariosPendientes > 0 && (
                  <> · {operativo.voluntariosPendientes} por revisar</>
                )}
              </p>
            </div>

            {/* Pedidos pendientes */}
            <div
              className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-4 flex flex-col gap-2"
              style={{ boxShadow: "var(--surface-glass-shadow)" }}
            >
              <p className="text-[10px] font-medium uppercase tracking-widest text-primary">
                Pedidos · pendientes
              </p>
              <p
                className="font-mono text-2xl font-semibold tabular-nums leading-none"
                style={{
                  color:
                    operativo.pedidosPendientes > 0
                      ? "hsl(var(--destructive))"
                      : undefined,
                }}
              >
                {operativo.pedidosPendientes}
              </p>
              {operativo.pedidosPendientes > 0 ? (
                <Link
                  href="/inventario/pedidos"
                  className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
                >
                  Ver pedidos
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">Sin pedidos activos</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Turnos y alertas */}
      {esAdminOGerente && (
        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-primary">
              Turnos · hoy
            </h3>
            <TurnosHoy turnos={turnosHoy} />
          </div>
          <div>
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-primary">
              Alertas
            </h3>
            <AlertasPanel alertas={alertas} />
          </div>
        </section>
      )}

      {/* Cajero: solo alertas de cierres */}
      {!esAdminOGerente && alertas.length > 0 && (
        <section>
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-primary">
            Pendiente
          </h3>
          <AlertasPanel alertas={alertas} />
        </section>
      )}

      {/* Actividad reciente */}
      {esAdminOGerente && (
        <section>
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-primary">
            Actividad
          </h3>
          <ActividadFeed actividad={actividad} />
        </section>
      )}
    </div>
  );
}
