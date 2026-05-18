export default function GraciasPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-semibold mb-3">¡Gracias por apuntarte!</h1>
        <p className="text-muted-foreground mb-4">
          Tu solicitud ha sido registrada. Nos pondremos en contacto para confirmar tu asignación.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Volver
        </a>
      </div>
    </main>
  );
}
