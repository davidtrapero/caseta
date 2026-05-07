"use client";

import { useActionState, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { ActionResult } from "@/lib/action-result";
import { aprobarSolicitudAction, rechazarSolicitudAction } from "../actions";
import { construirMailto, construirWhatsapp } from "@/lib/voluntario-aviso";

type RechazarResult = {
  solicitudId: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  motivo: string;
};

export function AccionesSolicitud({ solicitudId }: { solicitudId: string }) {
  const [aprobarState, aprobarAction, aprobarPending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(aprobarSolicitudAction, null);

  const [rechazarState, rechazarAction, rechazarPending] = useActionState<
    ActionResult<RechazarResult> | null,
    FormData
  >(rechazarSolicitudAction, null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const rechazadaOk = rechazarState?.ok === true;
  const errorAprobar = aprobarState && !aprobarState.ok ? aprobarState.error : null;
  const errorRechazar = rechazarState && !rechazarState.ok ? rechazarState.error : null;
  const error = errorAprobar || errorRechazar;

  function abrirModal() {
    setMotivo("");
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setMotivo("");
  }

  return (
    <>
      <div className="flex flex-col gap-2 items-end">
        <div className="flex gap-2">
          <form action={aprobarAction}>
            <input type="hidden" name="solicitudId" value={solicitudId} />
            <Button type="submit" size="sm" disabled={aprobarPending || rechazarPending}>
              {aprobarPending ? "Aprobando…" : "Aprobar"}
            </Button>
          </form>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={aprobarPending || rechazarPending}
            onClick={abrirModal}
          >
            Rechazar
          </Button>
        </div>
        {error ? (
          <p className="text-xs text-destructive-foreground bg-destructive/90 rounded-sm px-2 py-1">
            {error}
          </p>
        ) : null}
      </div>

      <Modal
        open={modalAbierto && !rechazadaOk}
        onClose={cerrarModal}
        title="Rechazar solicitud"
        description="Indica el motivo del rechazo. Se guardará en el registro."
      >
        <form
          ref={formRef}
          action={rechazarAction}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="solicitudId" value={solicitudId} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="motivo-rechazo" className="text-sm font-medium">
              Motivo del rechazo
            </label>
            <textarea
              id="motivo-rechazo"
              name="motivo"
              rows={4}
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica brevemente por qué se rechaza esta solicitud…"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 outline-offset-2 outline-ring resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{motivo.length}/500</p>
            {errorRechazar ? (
              <p className="text-xs text-destructive">{errorRechazar}</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={cerrarModal}>
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

      {rechazadaOk && rechazarState.data ? (
        <ModalAviso data={rechazarState.data} onClose={cerrarModal} />
      ) : null}
    </>
  );
}

function ModalAviso({
  data,
  onClose,
}: {
  data: RechazarResult;
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
      title="Solicitud rechazada"
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
