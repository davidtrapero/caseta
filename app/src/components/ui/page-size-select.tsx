"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent } from "react";

interface PageSizeSelectProps {
  /** Tamaño de página actual */
  currentPageSize: number;
  /** Ruta base para mantener navegación (p. ej. '/admin/empleados') */
  basePath: string;
  /** Tamaños permitidos (default: [10, 25, 50, 100]) */
  sizes?: number[];
  /** Parámetros adicionales a mantener en la URL (p. ej. sort=nombre&order=asc) */
  queryParams?: string;
  /** Label para el select (default: 'Registros por página') */
  label?: string;
}

/**
 * Client Component para seleccionar tamaño de página.
 * Al cambiar, resetea `page=1` y mantiene otros parámetros.
 */
export function PageSizeSelect({
  currentPageSize,
  basePath,
  sizes = [10, 25, 50, 100],
  queryParams = "",
  label = "Registros por página",
}: PageSizeSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value, 10);

    // Construir nueva URL: resetea page=1, usa nuevo pageSize, mantiene otros params
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    params.set("pageSize", String(newPageSize));

    // Añadir queryParams si existen (sort, order, etc.)
    if (queryParams) {
      const extraParams = new URLSearchParams(queryParams);
      extraParams.forEach((value, key) => {
        params.set(key, value);
      });
    }

    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="page-size-select" className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id="page-size-select"
        value={currentPageSize}
        onChange={handleChange}
        className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {sizes.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
}
