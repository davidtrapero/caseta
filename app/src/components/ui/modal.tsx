"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// Modal ligero sin dependencias. Usa un backdrop fijo + panel centrado y
// gestiona focus trap básico + cierre con Escape.
// Se renderiza en un portal anclado al <body>: el layout principal usa
// `overflow-auto` y, sin portal, un `position: fixed` queda recortado por
// el scroll container y se ve por debajo de cards posteriores.
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
  const onCloseRef = React.useRef(onClose);
  React.useLayoutEffect(() => { onCloseRef.current = onClose; });

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Enfocar primer campo editable al abrir (excluye botones del chrome del modal).
    setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        "input:not([type=hidden]), select, textarea"
      ) ?? panelRef.current?.querySelector<HTMLElement>("button");
      el?.focus();
    }, 20);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // En SSR `document` no existe; el modal solo se monta en cliente, así que
  // basta comprobarlo directamente sin un flag de hydration. Evita el
  // setState-in-effect que detesta react-hooks/set-state-in-effect.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 isolate"
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
          "relative z-10 mt-8 w-full max-h-[calc(100vh-4rem)] flex flex-col rounded-lg border border-border bg-card text-card-foreground shadow-2xl ring-1 ring-black/10",
          widthClass
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4 shrink-0">
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
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
