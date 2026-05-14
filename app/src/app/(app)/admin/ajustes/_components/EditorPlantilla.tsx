"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormError } from "../../_components/page-header";
import type { ActionResult } from "@/lib/action-result";
import { actualizarPlantillaAction } from "../actions";

type Props = {
  clave: string;
  asunto: string | null;
  cuerpo: string;
  descripcion: string | null;
  variablesPermitidas: readonly string[];
};

const TITULOS: Record<string, string> = {
  rechazo_voluntario_email: "Email de rechazo",
  rechazo_voluntario_whatsapp: "WhatsApp de rechazo",
};

export function EditorPlantilla({
  clave,
  asunto,
  cuerpo,
  descripcion,
  variablesPermitidas,
}: Props) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ clave: string }> | null,
    FormData
  >(actualizarPlantillaAction, null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cuerpoVal, setCuerpoVal] = useState(cuerpo);

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const ok = state?.ok === true;

  const insertarVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const placeholder = `{${variable}}`;
    const start = textarea.selectionStart ?? cuerpoVal.length;
    const end = textarea.selectionEnd ?? cuerpoVal.length;
    const nuevo = cuerpoVal.slice(0, start) + placeholder + cuerpoVal.slice(end);
    setCuerpoVal(nuevo);
    // Restaurar el foco y posicionar el cursor justo después del placeholder.
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + placeholder.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  const titulo = TITULOS[clave] ?? clave;
  const tieneAsunto = asunto !== null;

  return (
    <section
      className="rounded-xl border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-md p-6"
      style={{ boxShadow: "var(--surface-glass-shadow)" }}
    >
      <header className="mb-4">
        <h3 className="text-base font-medium">{titulo}</h3>
        {descripcion ? (
          <p className="text-sm text-muted-foreground mt-1">{descripcion}</p>
        ) : null}
      </header>

      <form action={formAction} className="flex flex-col gap-4">
        {state && !state.ok ? <FormError message={state.error} /> : null}
        {ok ? (
          <p className="rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm">
            Plantilla guardada.
          </p>
        ) : null}

        <input type="hidden" name="clave" value={clave} />

        {tieneAsunto ? (
          <div>
            <Label htmlFor={`asunto-${clave}`}>Asunto</Label>
            <Input
              id={`asunto-${clave}`}
              name="asunto"
              defaultValue={asunto ?? ""}
              maxLength={200}
              placeholder="Asunto del email"
            />
            <FieldError messages={errors.asunto} />
          </div>
        ) : null}

        <div>
          <Label htmlFor={`cuerpo-${clave}`}>Cuerpo</Label>
          <textarea
            id={`cuerpo-${clave}`}
            name="cuerpo"
            ref={textareaRef}
            value={cuerpoVal}
            onChange={(e) => setCuerpoVal(e.target.value)}
            rows={8}
            maxLength={4000}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 outline-offset-2 outline-ring resize-y font-mono"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {cuerpoVal.length}/4000
          </p>
          <FieldError messages={errors.cuerpo} />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Variables disponibles (click para insertar)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {variablesPermitidas.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertarVariable(v)}
                className="inline-flex items-center rounded-md border border-border px-2 py-1 text-xs font-mono hover:border-primary/50 hover:bg-accent transition-colors"
              >
                {`{${v}}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar plantilla"}
          </Button>
        </div>
      </form>
    </section>
  );
}
