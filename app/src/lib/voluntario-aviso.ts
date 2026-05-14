import "server-only";
import { obtenerPlantilla, renderPlantilla } from "@/lib/plantillas";

export type VarsRechazo = {
  nombre: string;
  motivo: string;
  turnos?: string;   // descripción agregada (ej. "3 turnos")
  caseta?: string;
  fechas?: string;
};

export type AvisoRechazo = {
  asunto: string;
  cuerpoEmail: string;
  cuerpoWhatsapp: string;
  mailto: string | null;
  whatsappUrl: string | null;
};

const ASUNTO_FALLBACK = "Tu solicitud de voluntario";

export async function construirAvisoRechazo(params: {
  email: string | null;
  telefono: string | null;
  vars: VarsRechazo;
}): Promise<AvisoRechazo> {
  const [pEmail, pWa] = await Promise.all([
    obtenerPlantilla("rechazo_voluntario_email"),
    obtenerPlantilla("rechazo_voluntario_whatsapp"),
  ]);

  const varsRecord: Record<string, string | undefined> = { ...params.vars };

  const asunto = pEmail?.asunto?.trim() || ASUNTO_FALLBACK;
  const cuerpoEmail = renderPlantilla(
    pEmail?.cuerpo ?? "Hola {nombre}, tu solicitud ha sido rechazada. {motivo}",
    varsRecord
  );
  const cuerpoWhatsapp = renderPlantilla(
    pWa?.cuerpo ??
      "Hola {nombre}, lamentablemente tu solicitud ha sido rechazada. Motivo: {motivo}",
    varsRecord
  );

  const mailto = params.email
    ? `mailto:${params.email}?subject=${encodeURIComponent(
        asunto
      )}&body=${encodeURIComponent(cuerpoEmail)}`
    : null;

  const whatsappUrl = params.telefono
    ? buildWaUrl(params.telefono, cuerpoWhatsapp)
    : null;

  return { asunto, cuerpoEmail, cuerpoWhatsapp, mailto, whatsappUrl };
}

function buildWaUrl(telefono: string, texto: string): string {
  const tel = telefono.replace(/[\s\-]/g, "");
  const telNorm = tel.startsWith("+") ? tel : `+34${tel}`;
  return `https://wa.me/${telNorm.replace("+", "")}?text=${encodeURIComponent(
    texto
  )}`;
}
