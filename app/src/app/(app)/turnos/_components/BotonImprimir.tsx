"use client";

export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border border-black px-3 py-1 text-sm"
    >
      Imprimir
    </button>
  );
}
