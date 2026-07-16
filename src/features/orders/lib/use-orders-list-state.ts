import type { SortingState } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { GetOrdersStatus, type GetOrdersParams } from '@/api/generated/qASAAPIDocumentation.schemas'

export type OrderStatusFilter = GetOrdersStatus | 'all'

export interface OrdersListState {
  page: number
  status: OrderStatusFilter
  clientId: string
  sorting: SortingState
}

/** URL search params are the single source of truth for the orders list. */
export function useOrdersListState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo<OrdersListState>(() => {
    const page = Number.parseInt(searchParams.get('page') ?? '', 10)
    const sortField = searchParams.get('sort')

    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      status: (searchParams.get('status') as OrderStatusFilter | null) ?? 'all',
      clientId: searchParams.get('client_id') ?? '',
      sorting: sortField ? [{ id: sortField, desc: searchParams.get('direction') === 'desc' }] : [],
    }
  }, [searchParams])

  const params = useMemo((): GetOrdersParams & { page: number } => {
    const query: GetOrdersParams & { page: number } = { page: state.page, per_page: 20 }
    if (state.status !== 'all') query.status = state.status
    if (state.clientId) query.client_id = state.clientId
    if (state.sorting[0]) {
      query.sort = state.sorting[0].id
      query.direction = state.sorting[0].desc ? 'desc' : 'asc'
    }
    return query
  }, [state])

  const patch = useCallback(
    (next: Partial<Omit<OrdersListState, 'page'>>) => {
      setSearchParams((previous) => {
        const nextParams = new URLSearchParams(previous)
        nextParams.delete('page')
        if ('status' in next)
          setOrDelete(nextParams, 'status', next.status === 'all' ? undefined : next.status)
        if ('clientId' in next) setOrDelete(nextParams, 'client_id', next.clientId)
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
