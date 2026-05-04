import { requireRole } from "@/lib/authz";

export default async function TurnosPage() {
  await requireRole(["admin", "gerente", "cajero"]);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-[var(--font-display)]">Turnos — Fase 3</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reconstrucción en curso (modelo multi-empleado).
      </p>
    </div>
  );
}
