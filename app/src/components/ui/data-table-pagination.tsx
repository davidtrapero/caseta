import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTablePaginationProps {
  /** Página actual (1-indexed) */
  page: number;
  /** Tamaño de página */
  pageSize: number;
  /** Total de registros */
  total: number;
  /** Ruta base para los links (p. ej. '/admin/empleados') */
  basePath: string;
  /** Parámetros adicionales a mantener en la URL (p. ej. ?sort=nombre&order=asc) */
  queryParams?: string;
}

/**
 * Componente Server de paginación.
 * Renderiza: "X–Y de Z" + botones prev/next como links (sin JavaScript).
 */
export function DataTablePagination({
  page,
  pageSize,
  total,
  basePath,
  queryParams = "",
}: DataTablePaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const hasNextPage = end < total;
  const hasPrevPage = page > 1;

  // Construir URLs manteniendo queryParams
  const prevUrl = `${basePath}?page=${page - 1}&pageSize=${pageSize}${queryParams ? `&${queryParams}` : ""}`;
  const nextUrl = `${basePath}?page=${page + 1}&pageSize=${pageSize}${queryParams ? `&${queryParams}` : ""}`;

  return (
    <div className="flex items-center justify-between gap-4 border-t pt-4">
      <div className="text-sm text-gray-600">
        {start}–{end} de {total}
      </div>
      <div className="flex gap-2">
        {hasPrevPage ? (
          <Link
            href={prevUrl}
            className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 text-gray-400 cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {hasNextPage ? (
          <Link
            href={nextUrl}
            className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 text-gray-400 cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
