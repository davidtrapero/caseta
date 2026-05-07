"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, children, className }: SheetProps) {
  // Cerrar con Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-xl",
          "flex flex-col animate-fade-in",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}
