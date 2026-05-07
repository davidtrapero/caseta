"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import type { ActionResult } from "@/lib/action-result";
import { aprobarTurnosAction, rechazarTurnosAction } from "../actions";
import { construirMailto, construirWhatsapp } from "@/lib/voluntario-aviso";
import { formatRangoTurno } from "@/app/(app)/turnos/_lib/fechas";
import type { EstadoSolicitudTurno } from "@prisma/client";

type TurnoItem = {
  id: string;
  estado: EstadoSolicitudTurno;
  motivoRechazo: string | null;
  fechaInicio: Date;
  fechaFin: Date;
  casetaNombre: string;
};

type Props = {
  solicitudId: string;
  turnos: TurnoItem[];
};

type RechazarOk = {
  solicitudId: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  motivo: string;
  rechazados: number;
};

const FECHA_DIA = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function badgeVariant(estado: EstadoSolicitudTurno) {
  switch (estado) {
    case "pendiente":
      return "default" as const;
    case "aprobado":
      return "active" as const;
    case "rechazado":
      return "destructive" as const;
  }
}

export function AccionesSolicitud({ solicitudId, turnos }: Props) {
  const router = useRouter();
  const pendientes = turnos.filter((t) => t.estado === "pendiente");

  const [seleccion, setSeleccion] = useState<string[]>(() =>
    pendientes.map((t) => t.id)
  );
  const [modalRechazar, setModalRechazar] = useState(false);
  const [avisoCerrado, setAvisoCerrado] = useState(false);
  const [motivo, setMotivo] = useState("");

  const [aprobarState, aprobarAction, aprobarPending] = useActionState<
    ActionResult<{ id: string; aprobados: number }> | null,
    FormData
  >(aprobarTurnosAction, null);

  const [rechazarState, rechazarAction, rechazarPending] = useActionState<
    ActionResult<RechazarOk> | null,
    FormData
  >(rechazarTurnosAction, null);

  const errorAprobar = aprobarState && !aprobarState.ok ? aprobarState.error : null;
  const errorRechazar = rechazarState && !rechazarState.ok ? rechazarState.error : null;
  const error = errorAprobar || errorRechazar;
  const rechazadaOk = rechazarState?.ok === true;

  const toggle = (id: string) => {
    setSeleccion((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  };

  const todasMarcadas =
    pendientes.length > 0 && seleccion.length === pendientes.length;
  const toggleTodas = () => {
    setSeleccion(todasMarcadas ? [] : pendientes.map((t) => t.id));
  };

  if (pendientes.length === 0) {
    return (
      <ul className="text-sm flex flex-col gap-1">
        {turnos.map((t) => (
          <TurnoLinea key={t.id} turno={t} />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Marca los turnos a decidir ({seleccion.length}/{pendientes.length})
        </p>
        <button
          type="button"
          onClick={toggleTodas}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          {todasMarcadas ? "Desmarcar todos" : "Marcar todos los pendientes"}
        </button>
      </div>

      <ul className="flex flex-col gap-1.5">
        {turnos.map((t) => {
          const checked = seleccion.includes(t.id);
          const editable = t.estado === "pendiente";
          return (
            <li key={t.id}>
              <label
                className={`flex items-baseline gap-3 rounded-md border px-3 py-2 text-sm ${
                  editable
                    ? "border-border hover:border-primary/50 cursor-pointer"
                    : "border-border/60 bg-muted/30 cursor-default"
                }`}
              >
                <input
                  type="checkbox"
                  checked={editable ? checked : false}
                  disabled={!editable}
                  onChange={() => editable && toggle(t.id)}
                  className="translate-y-[2px] h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <div className="flex-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-mono text-xs text-muted-foreground">
                    {FECHA_DIA.format(t.fechaInicio)} ·{" "}
                    {formatRangoTurno(t.fechaInicio, t.fechaFin)}
                  </span>
                  <span>· {t.casetaNombre}</span>
                  <Badge variant={badgeVariant(t.estado)} className="ml-1">
                    {t.estado}
                  </Badge>
                  {t.motivoRechazo ? (
                    <span className="basis-full text-xs text-muted-foreground italic">
                      Motivo: {t.motivoRechazo}
                    </span>
                  ) : null}
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <form action={aprobarAction}>
          <input type="hidden" name="solicitudId" value={solicitudId} />
          <input
            type="hidden"
            name="turnoIds"
            value={JSON.stringify(seleccion)}
          />
          <Button
            type="submit"
            size="sm"
            disabled={
              seleccion.length === 0 || aprobarPending || rechazarPending
            }
          >
            {aprobarPending
              ? "Aprobando…"
              : `Aprobar ${seleccion.length || ""}`.trim()}
          </Button>
        </form>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={
            seleccion.length === 0 || aprobarPending || rechazarPending
          }
          onClick={() => {
            setMotivo("");
            setAvisoCerrado(false);
            setModalRechazar(true);
          }}
        >
          Rechazar {seleccion.length || ""}
        </Button>
        {error ? (
          <p className="text-xs text-destructive-foreground bg-destructive/90 rounded-sm px-2 py-1">
            {error}
          </p>
        ) : null}
      </div>

      <Modal
        open={modalRechazar && !rechazadaOk}
        onClose={() => setModalRechazar(false)}
        title={`Rechazar ${seleccion.length} turno(s)`}
        description="Indica el motivo del rechazo. Se guardará en cada turno seleccionado."
      >
        <form action={rechazarAction} className="flex flex-col gap-4">
          <input type="hidden" name="solicitudId" value={solicitudId} />
          <input
            type="hidden"
            name="turnoIds"
            value={JSON.stringify(seleccion)}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`motivo-${solicitudId}`} className="text-sm font-medium">
              Motivo del rechazo
            </label>
            <textarea
              id={`motivo-${solicitudId}`}
              name="motivo"
              rows={4}
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica brevemente por qué se rechazan estos turnos…"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 outline-offset-2 outline-ring resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {motivo.length}/500
            </p>
            {errorRechazar ? (
              <p className="text-xs text-destructive">{errorRechazar}</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalRechazar(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={rechazarPending || motivo.trim().length < 5}
            >
              {rechazarPending ? "Rechazando…" : "Confirmar rechazo"}
            </Button>
          </div>
        </form>
      </Modal>

      {rechazadaOk && rechazarState.data && !avisoCerrado ? (
        <ModalAviso
          data={rechazarState.data}
          onClose={() => {
            setAvisoCerrado(true);
            setModalRechazar(false);
            // Refrescamos al cerrar (la action no revalida para no desmontar
            // este componente antes de que el aviso aparezca).
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function TurnoLinea({ turno: t }: { turno: TurnoItem }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="font-mono text-xs text-muted-foreground">
        {FECHA_DIA.format(t.fechaInicio)} ·{" "}
        {formatRangoTurno(t.fechaInicio, t.fechaFin)}
      </span>
      <span>· {t.casetaNombre}</span>
      <Badge variant={badgeVariant(t.estado)} className="ml-1">
        {t.estado}
      </Badge>
      {t.motivoRechazo ? (
        <span className="basis-full text-xs text-muted-foreground italic">
          Motivo: {t.motivoRechazo}
        </span>
      ) : null}
    </li>
  );
}

function ModalAviso({
  data,
  onClose,
}: {
  data: RechazarOk;
  onClose: () => void;
}) {
  const mailtoUrl = data.email
    ? construirMailto(data.nombre, data.email, data.motivo)
    : null;
  const whatsappUrl = data.telefono
    ? construirWhatsapp(data.telefono, data.nombre, data.motivo)
    : null;

  return (
    <Modal
      open
      onClose={onClose}
      title={`${data.rechazados} turno(s) rechazado(s)`}
      description={`Puedes notificar a ${data.nombre} por los siguientes canales:`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {mailtoUrl ? (
            <a
              href={mailtoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Enviar por email
            </a>
          ) : null}
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Enviar por WhatsApp
            </a>
          ) : null}
          {!mailtoUrl && !whatsappUrl ? (
            <p className="text-sm text-muted-foreground">
              Esta solicitud no tiene email ni teléfono registrados.
            </p>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
