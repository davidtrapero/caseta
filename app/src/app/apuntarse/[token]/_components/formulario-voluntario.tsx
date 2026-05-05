"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "@/app/(app)/admin/_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import { crearSolicitudAction } from "../actions";

type DiaTurnos = {
  clave: string;
  titulo: string;
  casetas: Array<{
    nombre: string;
    turnos: Array<{ id: string; rango: string; huecos: number }>;
  }>;
};

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
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok ? <FormError message={state.error} /> : null}
      <input type="hidden" name="_token" value={token} />

      <section className="rounded-lg border bg-card p-5 flex flex-col gap-4">
        <h2 className="text-base font-medium">Tus datos</h2>

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
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <FieldError messages={errors.observaciones} />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-medium">Turnos disponibles</h2>
          <p className="text-sm text-muted-foreground">
            Marca los que quieras hacer. No deben solaparse entre sí.
          </p>
        </div>
        <FieldError messages={errors.turnoIds} />

        <div className="flex flex-col gap-5">
          {dias.map((dia) => (
            <div key={dia.clave}>
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">
                {dia.titulo}
              </h3>
              <div className="flex flex-col gap-3">
                {dia.casetas.map((caseta) => (
                  <div key={caseta.nombre} className="rounded-md border p-3">
                    <p className="text-sm font-medium mb-2">{caseta.nombre}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {caseta.turnos.map((t) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 text-sm rounded px-2 py-1 hover:bg-accent cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            name="turnoIds"
                            value={t.id}
                            className="h-4 w-4 rounded border-input"
                          />
                          <span>{t.rango}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {t.huecos} hueco{t.huecos === 1 ? "" : "s"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Apuntarme"}
        </Button>
      </div>
    </form>
  );
}
