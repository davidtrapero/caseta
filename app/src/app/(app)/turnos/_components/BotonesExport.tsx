"use client";

import { useState } from "react";

export function BotonesExport({
  targetId,
  nombreArchivo,
}: {
  targetId: string;
  nombreArchivo: string;
}) {
  const [descargando, setDescargando] = useState(false);

  async function descargarPng() {
    const node = document.getElementById(targetId);
    if (!node) return;
    setDescargando(true);
    try {
      const mod = await import("html-to-image");
      const dataUrl = await mod.toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#ebe3d3",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `${nombreArchivo}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDescargando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => window.print()}
        className="border border-foreground/40 bg-card px-3 py-1.5 text-sm rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        Imprimir / PDF
      </button>
      <button
        type="button"
        onClick={descargarPng}
        disabled={descargando}
        className="border border-foreground/40 bg-card px-3 py-1.5 text-sm rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
      >
        {descargando ? "Generando…" : "Descargar imagen"}
      </button>
    </>
  );
}
