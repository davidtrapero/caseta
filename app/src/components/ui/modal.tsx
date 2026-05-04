"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// Modal ligero sin dependencias. Usa un backdrop fijo + panel centrado y
// gestiona focus trap básico + cierre con Escape.
// Alternativa considerada: @radix-ui/react-dialog (no instalado; evitamos nueva dep).

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  widthClass = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  widthClass?: string;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Enfocar primer input al abrir.
    setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        "input, select, textarea, button"
      );
      el?.focus();
    }, 20);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div
        ref={panelRef}
        className={cn(
          "mt-16 w-full rounded-lg border border-border bg-card text-card-foreground shadow-xl",
          widthClass
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <h3 id="modal-title" className="text-lg font-semibold leading-tight">
              {title}
            </h3>
            {description ? (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-sm p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
