"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function mapAuthError(msg: string | undefined): string {
  if (!msg) return "Credenciales incorrectas. Inténtalo de nuevo.";
  const lower = msg.toLowerCase();
  if (lower.includes("invalid email or password") || lower.includes("invalid credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (lower.includes("email not verified")) {
    return "Debes verificar tu email antes de acceder.";
  }
  if (lower.includes("account not found") || lower.includes("user not found")) {
    return "No existe ninguna cuenta con ese email.";
  }
  if (lower.includes("too many") || lower.includes("rate limit")) {
    return "Demasiados intentos fallidos. Espera unos minutos.";
  }
  if (lower.includes("account disabled") || lower.includes("banned")) {
    return "Esta cuenta ha sido desactivada. Contacta con la administración.";
  }
  return "Error al iniciar sesión. Inténtalo de nuevo.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const { error: authError } = await signIn.email({
      email,
      password,
      callbackURL: searchParams.get("from") ?? "/",
    });

    setLoading(false);

    if (authError) {
      setError(mapAuthError(authError.message));
      return;
    }

    router.push(searchParams.get("from") ?? "/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center pb-2">
        <div className="text-4xl mb-2" aria-hidden="true">🎪</div>
        <CardTitle className="text-2xl font-semibold">Caseta</CardTitle>
        <CardDescription>Accede con tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md bg-[hsl(var(--destructive)/0.1)] border border-destructive/20 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner size={14} />
                Entrando…
              </span>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
