"use client";

import { useTransition } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setTheme, type Theme } from "@/app/actions/theme";

export function ThemeToggle({ theme }: { theme: Theme }) {
  const [isPending, startTransition] = useTransition();
  const next: Theme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      disabled={isPending}
      onClick={() => startTransition(() => setTheme(next))}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
