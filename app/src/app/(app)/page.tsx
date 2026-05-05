import { getSession } from "@/lib/authz";
import { redirect } from "next/navigation";
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

const FORMATO_EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

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
          title="No hay edición activa"
          description="Activa una edición en Administración para ver el dashboard."
          actionHref="/admin/ediciones"
          actionLabel="Ir a ediciones"
        />
      </div>
    );
  }

  const { kpis, turnosHoy, alertas, actividad } = data;

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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              etiqueta="Ingresos hoy"
              valor={kpis.ingresosHoy}
              nota="Cierres registrados hoy"
              tono="positivo"
            />
            {esAdminOGerente ? (
              <>
                <KpiCard
                  etiqueta="Gastos edición"
                  valor={kpis.gastosEdicion}
                  nota="Acumulado desde inicio"
                  tono="negativo"
                />
                <KpiCard
                  etiqueta="Resultado neto"
                  valor={kpis.resultadoNeto}
                  nota="Ingresos − gastos − nóminas"
                  tono={kpis.resultadoNeto >= 0 ? "neto-positivo" : "neto-negativo"}
                />
                <KpiCard
                  etiqueta="Nóminas pendientes"
                  valor={kpis.nominasPendientesTotal}
                  nota={`${kpis.nominasPendientesCount} empleado${kpis.nominasPendientesCount !== 1 ? "s" : ""} sin pagar`}
                  tono={kpis.nominasPendientesCount > 0 ? "negativo" : "neutro"}
                />
              </>
            ) : (
              <KpiCard
                etiqueta="Ingresos edición"
                valor={kpis.ingresosEdicion}
                nota="Acumulado desde inicio"
                tono="positivo"
              />
            )}
          </div>
        </section>
      )}

      {/* Turnos y alertas */}
      {esAdminOGerente && (
        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Turnos de hoy
            </h3>
            <TurnosHoy turnos={turnosHoy} />
          </div>
          <div>
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Alertas
            </h3>
            <AlertasPanel alertas={alertas} />
          </div>
        </section>
      )}

      {/* Cajero: solo alertas de cierres */}
      {!esAdminOGerente && alertas.length > 0 && (
        <section>
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Pendiente
          </h3>
          <AlertasPanel alertas={alertas} />
        </section>
      )}

      {/* Actividad reciente */}
      {esAdminOGerente && (
        <section>
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Actividad reciente
          </h3>
          <ActividadFeed actividad={actividad} />
        </section>
      )}
    </div>
  );
}
