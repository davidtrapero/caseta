export default function InicioPage() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold mb-2">Bienvenido</h2>
      <p className="text-muted-foreground mb-8">
        App privada de gestión de casetas de feria.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-6">
          <h3 className="font-medium mb-1">Fase 0 — Bootstrap</h3>
          <p className="text-sm text-muted-foreground">
            Next.js, Prisma, Better Auth y shadcn/ui listos. Próxima fase:
            módulo de Administración.
          </p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-medium mb-1">Auditoría activa</h3>
          <p className="text-sm text-muted-foreground">
            Todos los cambios a entidades de dominio se registran automáticamente
            en AuditLog.
          </p>
        </div>
      </div>
    </div>
  );
}
