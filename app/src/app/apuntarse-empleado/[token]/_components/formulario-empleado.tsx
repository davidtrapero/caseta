"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { FieldError, FormError } from "@/app/(app)/admin/_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { buscarEmpleadoPorDniAction, crearSolicitudEmpleadoAction } from "../actions";

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

interface FormularioEmpleadoProps {
  token: string;
  dias: DiaTurnos[];
}

export function FormularioEmpleado({ token, dias }: FormularioEmpleadoProps) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(async (prev, formData) => {
    const result = await crearSolicitudEmpleadoAction(prev, formData);
    if (result.ok) router.push(`/apuntarse-empleado/${token}/gracias`);
    return result;
  }, null);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const values = state && !state.ok ? (state.values ?? {}) : {};

  // DNI autocomplete state
  const [dniBuscando, setDniBuscando] = useState(false);
  const [dniEncontrado, setDniEncontrado] = useState<boolean | null>(null);
  const [autoNombre, setAutoNombre] = useState((values?.nombre as string) ?? "");
  const [autoApellidos, setAutoApellidos] = useState((values?.apellidos as string) ?? "");
  const [autoEmail, setAutoEmail] = useState((values?.email as string) ?? "");
  const [autoTelefono, setAutoTelefono] = useState((values?.telefono as string) ?? "");
  async function handleDniBlur(e: React.FocusEvent<HTMLInputElement>) {
    const dni = e.target.value.trim();
    if (!dni) {
      setDniEncontrado(null);
      return;
    }

    setDniBuscando(true);
    const fd = new FormData();
    fd.set("dni", dni);

    const result = await buscarEmpleadoPorDniAction(fd);
    setDniBuscando(false);
    if (result.ok && result.data.encontrado && result.data.datos) {
      const { nombre, email, telefono } = result.data.datos;
      setDniEncontrado(true);
      setAutoNombre(nombre);
      setAutoApellidos("");
      setAutoEmail(email ?? "");
      setAutoTelefono(telefono ?? "");
    } else {
      setDniEncontrado(false);
    }
  }

  // Filter state (local only, doesn't affect submission)
  const [diaSeleccionado, setDiaSeleccionado] = useState("");
  const [casetaSeleccionada, setCasetaSeleccionada] = useState("");

  const casetasDisponibles = useMemo(
    () =>
      Array.from(
        new Map(
          dias.flatMap((d) => d.casetas).map((c) => [c.nombre, c])
        ).values()
      ),
    [dias]
  );

  const diasFiltrados = useMemo(() => {
    return dias
      .filter((d) => !diaSeleccionado || d.clave === diaSeleccionado)
      .map((d) => ({
        ...d,
        casetas: d.casetas.filter(
          (c) => !casetaSeleccionada || c.nombre === casetaSeleccionada
        ),
      }))
      .filter((d) => d.casetas.length > 0);
  }, [dias, diaSeleccionado, casetaSeleccionada]);

  return (
    <form action={formAction} className="flex flex-col gap-6 animate-fade-in">
      {state && !state.ok ? <FormError message={state.error} /> : null}
      <input type="hidden" name="_token" value={token} />

      {/* DNI */}
      <section className="rounded-lg border bg-card p-5 flex flex-col gap-4">
        <h2 className="text-base font-semibold">🪪 Tu DNI</h2>

        <div>
          <Label htmlFor="dni">DNI / NIE</Label>
          <div className="relative">
            <Input
              id="dni"
              name="dni"
              required
              maxLength={20}
              placeholder="12345678X"
              defaultValue={values?.dni as string}
              onBlur={handleDniBlur}
            />
          </div>
          {dniBuscando && (
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <Spinner size={12} />
              Buscando…
            </p>
          )}
          {!dniBuscando && dniEncontrado === true && (
            <p className="mt-1 text-xs text-accent">✓ Empleado encontrado</p>
          )}
          <FieldError messages={errors.dni} />
        </div>
      </section>

      {/* Datos de contacto */}
      <section className="rounded-lg border bg-card p-5 flex flex-col gap-4">
        <h2 className="text-base font-semibold">🧑 Tus datos</h2>

        <div>
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            required
            maxLength={120}
            placeholder="María"
            value={autoNombre}
            onChange={(e) => setAutoNombre(e.target.value)}
          />
          <FieldError messages={errors.nombre} />
        </div>

        <div>
          <Label htmlFor="apellidos">
            Apellidos{" "}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="apellidos"
            name="apellidos"
            maxLength={120}
            placeholder="García López"
            value={autoApellidos}
            onChange={(e) => setAutoApellidos(e.target.value)}
          />
          <FieldError messages={errors.apellidos} />
        </div>

        <p className="text-xs text-muted-foreground -mb-1">
          Indica al menos un medio de contacto (email o teléfono).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">
              Email{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              maxLength={254}
              placeholder="maria@ejemplo.com"
              value={autoEmail}
              onChange={(e) => setAutoEmail(e.target.value)}
            />
            <FieldError messages={errors.email} />
          </div>
          <div>
            <Label htmlFor="telefono">
              Teléfono{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              maxLength={20}
              placeholder="612 345 678"
              value={autoTelefono}
              onChange={(e) => setAutoTelefono(e.target.value)}
            />
            <FieldError messages={errors.telefono} />
          </div>
        </div>
      </section>

      {/* Turnos */}
      <section className="rounded-lg border bg-card p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">📅 Turnos disponibles</h2>
          <p className="text-sm text-muted-foreground">
            Marca los que quieras hacer. No deben solaparse entre sí.
          </p>
        </div>
        <FieldError messages={errors.turnoIds} />

        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="filtro-dia"
              className="text-xs text-muted-foreground"
            >
              Día
            </Label>
            <select
              id="filtro-dia"
              value={diaSeleccionado}
              onChange={(e) => setDiaSeleccionado(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 outline-offset-2 outline-ring"
            >
              <option value="">Todos los días</option>
              {dias.map((d) => (
                <option key={d.clave} value={d.clave}>
                  {d.titulo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="filtro-caseta"
              className="text-xs text-muted-foreground"
            >
              Caseta
            </Label>
            <select
              id="filtro-caseta"
              value={casetaSeleccionada}
              onChange={(e) => setCasetaSeleccionada(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 outline-offset-2 outline-ring"
            >
              <option value="">Todas las casetas</option>
              {casetasDisponibles.map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {diasFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay turnos para los filtros seleccionados.
            </p>
          ) : (
            diasFiltrados.map((dia) => (
              <div key={dia.clave}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {dia.titulo}
                </h3>
                <div className="flex flex-col gap-3">
                  {dia.casetas.map((caseta) => (
                    <fieldset
                      key={caseta.nombre}
                      className="rounded-md border p-3"
                    >
                      <legend className="px-1 text-sm font-medium">
                        {caseta.nombre}
                      </legend>
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
                              defaultChecked={(
                                values?.turnoIds as string[]
                              )?.includes(t.id)}
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
            ))
          )}
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
