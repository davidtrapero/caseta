import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
  canAct = true,
}: {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
  canAct?: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        ) : null}
      </div>
      {actionHref && actionLabel && canAct ? (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function FormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        ) : null}
      </div>
      <div className="rounded-lg border bg-card p-6">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-card/40 p-10 text-center">
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">{description}</p>
      {actionHref && actionLabel ? (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p className="text-xs text-destructive-foreground bg-destructive/90 rounded-sm px-2 py-1 mt-1">
      {messages.join(" · ")}
    </p>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground mb-4">
      {message}
    </div>
  );
}
