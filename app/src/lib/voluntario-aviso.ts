export function construirMailto(nombre: string, email: string, motivo: string): string {
  const subject = encodeURIComponent("Tu solicitud de voluntario");
  const body = encodeURIComponent(
    `Hola ${nombre},\n\nLamentablemente tu solicitud ha sido rechazada por el siguiente motivo:\n\n${motivo}\n\nSi tienes dudas, contacta con el equipo organizador.`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function construirWhatsapp(telefono: string, nombre: string, motivo: string): string {
  const text = encodeURIComponent(
    `Hola ${nombre}, lamentablemente tu solicitud de voluntario ha sido rechazada. Motivo: ${motivo}`
  );
  const tel = telefono.replace(/[\s\-]/g, "");
  const telNorm = tel.startsWith("+") ? tel : `+34${tel}`;
  return `https://wa.me/${telNorm.replace("+", "")}?text=${text}`;
}
