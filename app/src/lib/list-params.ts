import { z } from "zod";

/**
 * Opciones para parseListParams.
 */
export interface ParseListParamsOptions {
  /** Columnas permitidas para ordenar (whitelist) */
  allowedSorts?: string[];
  /** Tamaño de página por defecto (default: 25) */
  defaultPageSize?: number;
  /** Tamaños de página permitidos (whitelist, default: [10, 25, 50, 100]) */
  allowedPageSizes?: number[];
}

/**
 * Resultado parseado de parámetros de listado.
 */
export interface ListParams {
  page: number;
  pageSize: number;
  sort?: string;
  order?: "asc" | "desc";
  skip: number;
  take: number;
}

/**
 * Parsea SearchParams de Next.js para paginación, ordenación y tamaño de página.
 *
 * Lógica:
 * - `page`: entero ≥ 1 (default 1). Si < 1, clampea a 1.
 * - `pageSize`: debe estar en whitelist (default [10, 25, 50, 100]). Si no, usa default (25).
 * - `sort`: debe estar en allowedSorts si se proporciona. Si no, ignora.
 * - `order`: 'asc' o 'desc'. Si otro valor, ignora.
 * - Calcula `skip` y `take` para Prisma.
 *
 * @param searchParams - SearchParams de Next.js (tipo Record<string, string | string[]>)
 * @param options - Opciones de validación
 * @returns ListParams parseados y validados
 */
export function parseListParams(
  searchParams: Record<string, string | string[] | undefined>,
  options: ParseListParamsOptions = {}
): ListParams {
  const {
    allowedSorts = [],
    defaultPageSize = 25,
    allowedPageSizes = [10, 25, 50, 100],
  } = options;

  // Parse page
  const pageRaw = searchParams.page;
  const pageStr = Array.isArray(pageRaw) ? pageRaw[0] : pageRaw;
  let page = 1;
  if (pageStr) {
    const parsed = parseInt(pageStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      page = parsed;
    }
  }

  // Parse pageSize
  const pageSizeRaw = searchParams.pageSize;
  const pageSizeStr = Array.isArray(pageSizeRaw) ? pageSizeRaw[0] : pageSizeRaw;
  let pageSize = defaultPageSize;
  if (pageSizeStr) {
    const parsed = parseInt(pageSizeStr, 10);
    if (allowedPageSizes.includes(parsed)) {
      pageSize = parsed;
    }
  }

  // Parse sort (whitelist)
  const sortRaw = searchParams.sort;
  const sortStr = Array.isArray(sortRaw) ? sortRaw[0] : sortRaw;
  let sort: string | undefined;
  if (sortStr && allowedSorts.length > 0 && allowedSorts.includes(sortStr)) {
    sort = sortStr;
  }

  // Parse order
  const orderRaw = searchParams.order;
  const orderStr = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;
  let order: "asc" | "desc" | undefined;
  if (orderStr === "asc" || orderStr === "desc") {
    order = orderStr;
  }

  // Calculate skip and take for Prisma
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return {
    page,
    pageSize,
    sort,
    order,
    skip,
    take,
  };
}

/**
 * Valida un valor contra una whitelist usando Zod.
 * Útil para rechazar sort/filter no whitelisted en runtime.
 */
export function validateWhitelisted(
  value: unknown,
  whitelist: string[],
  fieldName: string
): string {
  if (whitelist.length === 0) {
    throw new Error(`Whitelist vacía para ${fieldName}`);
  }
  return z
    .enum([whitelist[0], ...whitelist.slice(1)] as [string, ...string[]])
    .parse(value);
}
