import nodemailer, { type Transporter } from "nodemailer";

type EnviarEmailResultado =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

let transporterCache: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporterCache !== undefined) return transporterCache;

  const host = process.env.SMTP_HOST;
  if (!host) {
    transporterCache = null;
    return null;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  transporterCache = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporterCache;
}

/**
 * Envía un email text-only por contrato (sin HTML, sin adjuntos).
 * Nunca lanza: errores de transporte se devuelven como `{ ok: false, error }`.
 */
export async function enviarEmail(params: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<EnviarEmailResultado> {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, error: "SMTP no configurado" };
  }

  const from = process.env.SMTP_FROM;
  if (!from) {
    return { ok: false, error: "SMTP_FROM no configurado" };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      replyTo: params.replyTo,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Error desconocido al enviar email";
    return { ok: false, error };
  }
}
