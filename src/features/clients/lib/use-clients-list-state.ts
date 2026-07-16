import type { SortingState } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  GetClientsClientType,
  GetClientsCurrency,
  GetClientsRole,
  type GetClientsParams,
} from '@/api/generated/qASAAPIDocumentation.schemas'

export type ClientTypeFilter = GetClientsClientType | 'all'
export type CurrencyFilter = GetClientsCurrency | 'all'

export interface ClientsListState {
  page: number
  search: string
  role: GetClientsRole
  clientType: ClientTypeFilter
  currency: CurrencyFilter
  sorting: SortingState
}

/** URL search params are the single source of truth for the clients list. */
export function useClientsListState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo<ClientsListState>(() => {
    const page = Number.parseInt(searchParams.get('page') ?? '', 10)
    const sortField = searchParams.get('sort')

    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      search: searchParams.get('search') ?? '',
      role: (searchParams.get('role') as GetClientsRole | null) ?? GetClientsRole.all,
      clientType: (searchParams.get('client_type') as ClientTypeFilter | null) ?? 'all',
      currency: (searchParams.get('currency') as CurrencyFilter | null) ?? 'all',
      sorting: sortField ? [{ id: sortField, desc: searchParams.get('direction') === 'desc' }] : [],
    }
  }, [searchParams])

  const params = useMemo((): GetClientsParams & { page: number } => {
    const query: GetClientsParams & { page: number } = { page: state.page, per_page: 20 }
    if (state.search) query.search = state.search
    if (state.role !== GetClientsRole.all) query.role = state.role
    if (state.clientType !== 'all') query.client_type = state.clientType
    if (state.currency !== 'all') query.currency = state.currency
    if (state.sorting[0]) {
      query.sort = state.sorting[0].id
      query.direction = state.sorting[0].desc ? 'desc' : 'asc'
    }
    return query
  }, [state])

  /** Filter/sort changes reset to page 1; only page changes preserve the rest. */
  const patch = useCallback(
    (next: Partial<Omit<ClientsListState, 'page'>>, options?: { resetPage?: boolean }) => {
      setSearchParams((previous) => {
        const nextParams = new URLSearchParams(previous)
        if (options?.resetPage !== false) {
          nextParams.delete('page')
        }
        if ('search' in next) setOrDelete(nextParams, 'search', next.search)
        if ('role' in next)
          setOrDelete(nextParams, 'role', next.role === GetClientsRole.all ? undefined : next.role)
        if ('clientType' in next)
          setOrDelete(
            nextParams,
            'client_type',
            next.clientType === 'all' ? undefined : next.clientType,
          )
        if ('currency' in next)
          setOrDelete(nextParams, 'currency', next.currency === 'all' ? undefined : next.currency)
        if ('sorting' in next) {
          const sort = next.sorting?.[0]
          setOrDelete(nextParams, 'sort', sort?.id)
          setOrDelete(nextParams, 'direction', sort ? (sort.desc ? 'desc' : 'asc') : undefined)
        }
        return nextParams
      })
    },
    [setSearchParams],
  )

  const setPage = useCallback(
    (page: number) => {
      setSearchParams((previous) => {
        const nextParams = new URLSearchParams(previous)
        setOrDelete(nextParams, 'page', page > 1 ? String(page) : undefined)
        return nextParams
      })
    },
    [setSearchParams],
  )

  return { state, params, patch, setPage }
}

function setOrDelete(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) {
    params.set(key, value)
  } else {
    params.delete(key)
  }
}
