export const DEFAULT_PER_PAGE = 20
export const MAX_PER_PAGE = 100

/** Laravel's default paginator meta shape — the OpenAPI spec only documents `meta: object`. */
export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export function asPaginationMeta(meta: unknown): PaginationMeta | undefined {
  if (
    meta &&
    typeof meta === 'object' &&
    'current_page' in meta &&
    'last_page' in meta &&
    'per_page' in meta &&
    'total' in meta
  ) {
    return meta as PaginationMeta
  }
  return undefined
}

export interface PaginationState {
  page: number
  perPage: number
  sort: string | null
}

/** Reads pagination state from URL search params (single source of truth for lists). */
export function paginationFromSearchParams(searchParams: URLSearchParams): PaginationState {
  const page = Number.parseInt(searchParams.get('page') ?? '', 10)
  const perPage = Number.parseInt(searchParams.get('per_page') ?? '', 10)

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    perPage:
      Number.isFinite(perPage) && perPage > 0 ? Math.min(perPage, MAX_PER_PAGE) : DEFAULT_PER_PAGE,
    sort: searchParams.get('sort'),
  }
}

/** Builds backend query params (Laravel paginator + Spatie sort convention). */
export function paginationToQuery(state: PaginationState): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: state.page,
    per_page: state.perPage,
  }
  if (state.sort) {
    query.sort = state.sort
  }
  return query
}
