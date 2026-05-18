"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";

interface SortableHeaderProps {
  /** Columna/campo para ordenar (p. ej. 'nombre') */
  column: string;
  /** Texto a mostrar en el header */
  label: string;
  /** Ruta base para navegación (p. ej. '/admin/empleados') */
  basePath: string;
  /** Ordenación actual (asc, desc, o undefined) */
  currentOrder?: "asc" | "desc";
  /** Columna ordenada actual (p. ej. 'nombre') */
  currentSort?: string;
  /** Parámetros adicionales a mantener en la URL */
  queryParams?: string;
}

/**
 * Client Component para header ordenable en tablas.
 * Click alterna: asc → desc → sin orden (neutro).
 * Renderiza flechas: ↑ (asc), ↓ (desc), vacío (sin orden).
 */
export function SortableHeader({
  column,
  label,
  basePath,
  currentOrder,
  currentSort,
  queryParams = "",
}: SortableHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isActive = currentSort === column;
  let nextOrder: "asc" | "desc" | undefined;

  // Lógica de alternancia: asc → desc → undefined (neutro) → asc
  if (!isActive) {
    nextOrder = "asc"; // Primera vez: comienza con asc
  } else if (currentOrder === "asc") {
    nextOrder = "desc"; // asc → desc
  } else if (currentOrder === "desc") {
    nextOrder = undefined; // desc → neutro
  } else {
    nextOrder = "asc"; // neutro → asc
  }

  const handleClick = () => {
    const params = new URLSearchParams(searchParams);
    // Resetea page al cambiar ordenación
    params.set("page", "1");

    if (nextOrder) {
      params.set("sort", column);
      params.set("order", nextOrder);
    } else {
      params.delete("sort");
      params.delete("order");
    }

    // Mantener pageSize si existe
    if (!params.has("pageSize")) {
      params.set("pageSize", "25");
    }

    // Añadir queryParams adicionales si existen
    if (queryParams) {
      const extraParams = new URLSearchParams(queryParams);
      extraParams.forEach((value, key) => {
        if (!params.has(key)) {
          params.set(key, value);
        }
      });
    }

    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 font-medium hover:text-blue-600 transition-colors"
      aria-sort={
        currentSort === column
          ? currentOrder === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      {label}
      <span className="inline-flex w-4 h-4">
        {isActive && currentOrder === "asc" && (
          <ArrowUp className="w-4 h-4 text-blue-600" />
        )}
        {isActive && currentOrder === "desc" && (
          <ArrowDown className="w-4 h-4 text-blue-600" />
        )}
        {!isActive && <span className="w-4" />}
      </span>
    </button>
  );
}
