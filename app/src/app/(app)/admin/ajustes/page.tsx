import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { SectionHeader } from "../_components/page-header";
import { EditorPlantilla } from "./_components/EditorPlantilla";
import { VARIABLES_RECHAZO_VOLUNTARIO } from "@/lib/plantillas";

export default async function AjustesPage() {
  await requireRole(["admin"]);
  const plantillas = await prisma.plantillaMensaje.findMany({
    where: {
      clave: { in: ["rechazo_voluntario_email", "rechazo_voluntario_whatsapp"] },
    },
    orderBy: { clave: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <SectionHeader
        title="Plantillas de mensajes"
        subtitle="Edita los textos enviados a voluntarios al rechazar turnos. Variables disponibles: {nombre}, {motivo}, {turnos}, {caseta}, {fechas}."
      />
      {plantillas.map((p) => (
        <EditorPlantilla
          key={p.id}
          clave={p.clave}
          asunto={p.asunto}
          cuerpo={p.cuerpo}
          descripcion={p.descripcion}
          variablesPermitidas={VARIABLES_RECHAZO_VOLUNTARIO as readonly string[]}
        />
      ))}
    </div>
  );
}
