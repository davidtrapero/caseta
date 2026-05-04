export function ModulePlaceholder({
  title,
  phase,
}: {
  title: string;
  phase: string;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">
        Módulo pendiente. Se implementará en la fase: <strong>{phase}</strong>.
      </p>
      <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
        Consulta{" "}
        <code className="font-mono bg-muted px-1 py-0.5 rounded">
          plans/lanza-un-agente-arquitecto-optimized-finch.md
        </code>{" "}
        para el orden de módulos y criterios de aceptación.
      </div>
    </div>
  );
}
