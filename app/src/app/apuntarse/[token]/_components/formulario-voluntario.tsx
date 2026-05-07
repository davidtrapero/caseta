"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { FieldError, FormError } from "@/app/(app)/admin/_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import { crearSolicitudAction } from "../actions";
import { cn } from "@/lib/utils";

type DiaTurnos = {
  clave: string;
  titulo: string;
  casetas: Array<{
    nombre: string;
    turnos: Array<{ id: string; rango: string; huecos: number }>;
  }>;
};

function HuecosBadge({ huecos }: { huecos: number }) {
  return (
    <span
      className={cn(
        "ml-auto text-xs px-1.5 py-0.5 rounded font-medium tabular-nums",
        huecos <= 2
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground"
      )}
    >
      {huecos} {huecos === 1 ? "hueco" : "huecos"}
    </span>
  );
}

export function FormularioVoluntario({
  token,
  entidades,
  dias,
}: {
  token: string;
  entidades: Array<{ id: string; nombre: string }>;
  dias: DiaTurnos[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(async (prev, formData) => {
    const result = await crearSolicitudAction(prev, formData);
    if (result.ok) router.push(`/apuntarse/${token}/gracias`);
    return result;
  }, null);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="flex flex-col gap-6 animate-fade-in">
      {state && !state.ok ? <FormError message={state.error} /> : null}
      <input type="hidden" name="_token" value={token} />

      <section className="rounded-lg border bg-card p-5 flex flex-col gap-4">
        <h2 className="text-base font-semibold">🧑 Tus datos</h2>

        <div>
          <Label htmlFor="nombre">Nombre y apellidos</Label>
          <Input
            id="nombre"
            name="nombre"
            required
            maxLength={120}
            placeholder="María García"
          />
          <FieldError messages={errors.nombre} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              required
              maxLength={20}
              placeholder="612 345 678"
            />
            <FieldError messages={errors.telefono} />
          </div>
          <div>
            <Label htmlFor="entidadId">Entidad / hermandad</Label>
            <select
              id="entidadId"
              name="entidadId"
              required
              defaultValue=""
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 outline-offset-2 outline-ring"
            >
              <option value="" disabled>
                Selecciona una entidad
              </option>
              {entidades.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <FieldError messages={errors.entidadId} />
          </div>
        </div>

        <div>
          <Label htmlFor="observaciones">Observaciones (opcional)</Label>
          <textarea
            id="observaciones"
            name="observaciones"
            maxLength={500}
            rows={3}
            placeholder="Disponibilidad, restricciones, alergias…"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 outline-offset-2 outline-ring"
          />
          <FieldError messages={errors.observaciones} />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">📅 Turnos disponibles</h2>
          <p className="text-sm text-muted-foreground">
            Marca los que quieras hacer. No deben solaparse entre sí.
          </p>
        </div>
        <FieldError messages={errors.turnoIds} />

        <div className="flex flex-col gap-5">
          {dias.map((dia) => (
            <div key={dia.clave}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {dia.titulo}
              </h3>
              <div className="flex flex-col gap-3">
                {dia.casetas.map((caseta) => (
                  <fieldset key={caseta.nombre} className="rounded-md border p-3">
                    <legend className="px-1 text-sm font-medium">{caseta.nombre}</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {caseta.turnos.map((t) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 text-sm rounded px-2 py-1.5 hover:bg-accent/20 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            name="turnoIds"
                            value={t.id}
                            className="h-4 w-4 rounded border-input"
                          />
                          <span>{t.rango}</span>
                          <HuecosBadge huecos={t.huecos} />
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? (
            <span className="flex items-center gap-2">
              <Spinner size={14} />
              Enviando…
            </span>
          ) : (
            "Apuntarme"
          )}
        </Button>
      </div>
    </form>
  );
}
