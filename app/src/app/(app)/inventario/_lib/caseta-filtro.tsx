import Link from "next/link";

export type CasetaMin = { id: string; nombre: string };

export function construirHref(base: string, casetaId?: string) {
  return casetaId ? `${base}?caseta=${casetaId}` : base;
}

export function FiltroCaseta({
  base,
  casetas,
  activo,
}: {
  base: string;
  casetas: CasetaMin[];
  activo?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        Caseta:
      </span>
      <Chip href={base} label="Todas" activo={!activo} />
      {casetas.map((c) => (
        <Chip
          key={c.id}
          href={construirHref(base, c.id)}
          label={c.nombre}
          activo={activo === c.id}
        />
      ))}
    </div>
  );
}

function Chip({
  href,
  label,
  activo,
}: {
  href: string;
  label: string;
  activo: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        activo
          ? "inline-flex items-center rounded-sm border border-primary/50 bg-primary/20 px-2 py-0.5 text-xs font-medium"
          : "inline-flex items-center rounded-sm border border-border bg-transparent px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}
