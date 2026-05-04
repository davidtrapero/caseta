"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; message: string; tone: "info" | "error" | "success" };

type ToastCtx = {
  show: (message: string, tone?: Toast["tone"]) => void;
};

const Ctx = React.createContext<ToastCtx | null>(null);

export function useToast() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useToast fuera de <ToastProvider>");
  return c;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const show = React.useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const ctxValue = React.useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={ctxValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto min-w-[240px] max-w-sm rounded-md border px-3 py-2 text-sm shadow-lg",
              t.tone === "error" &&
                "border-destructive/50 bg-destructive/95 text-destructive-foreground",
              t.tone === "success" &&
                "border-primary/50 bg-primary/90 text-primary-foreground",
              t.tone === "info" && "border-border bg-card text-card-foreground"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
