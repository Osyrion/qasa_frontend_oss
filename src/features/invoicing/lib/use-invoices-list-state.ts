import type { SortingState } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  GetInvoicesCurrency,
  GetInvoicesStatus,
  type GetInvoicesParams,
} from '@/api/generated/qASAAPIDocumentation.schemas'

export type InvoiceStatusFilter = GetInvoicesStatus | 'all'
export type InvoiceCurrencyFilter = GetInvoicesCurrency | 'all'

export interface InvoicesListState {
  page: number
  status: InvoiceStatusFilter
  clientId: string
  currency: InvoiceCurrencyFilter
  dateFrom: string
  dateTo: string
  overdue: boolean
  sorting: SortingState
}

/** URL search params are the single source of truth for the invoices list. */
export function useInvoicesListState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo<InvoicesListState>(() => {
    const page = Number.parseInt(searchParams.get('page') ?? '', 10)
    const sortField = searchParams.get('sort')

    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      status: (searchParams.get('status') as InvoiceStatusFilter | null) ?? 'all',
      clientId: searchParams.get('client_id') ?? '',
      currency: (searchParams.get('currency') as InvoiceCurrencyFilter | null) ?? 'all',
      dateFrom: searchParams.get('date_from') ?? '',
      dateTo: searchParams.get('date_to') ?? '',
      overdue: searchParams.get('overdue') === '1',
      sorting: sortField ? [{ id: sortField, desc: searchParams.get('direction') === 'desc' }] : [],
    }
  }, [searchParams])

  const params = useMemo((): GetInvoicesParams & { page: number } => {
    const query: GetInvoicesParams & { page: number } = { page: state.page, per_page: 20 }
    if (state.status !== 'all') query.status = state.status
    if (state.clientId) query.client_id = state.clientId
    if (state.currency !== 'all') query.currency = state.currency
    if (state.dateFrom) query.date_from = state.dateFrom
    if (state.dateTo) query.date_to = state.dateTo
    if (state.overdue) query.overdue = true
    if (state.sorting[0]) {
      query.sort = state.sorting[0].id
      query.direction = state.sorting[0].desc ? 'desc' : 'asc'
    }
    return query
  }, [state])

  /** Filter/sort changes reset to page 1; only page changes preserve the rest. */
  const patch = useCallback(
    (next: Partial<Omit<InvoicesListState, 'page'>>) => {
      setSearchParams((previous) => {
        const nextParams = new URLSearchParams(previous)
        nextParams.delete('page')
        if ('status' in next)
          setOrDelete(nextParams, 'status', next.status === 'all' ? undefined : next.status)
        if ('clientId' in next) setOrDelete(nextParams, 'client_id', next.clientId)
        if ('currency' in next)
          setOrDelete(nextParams, 'currency', next.currency === 'all' ? undefined : next.currency)
        if ('dateFrom' in next) setOrDelete(nextParams, 'date_from', next.dateFrom)
        if ('dateTo' in next) setOrDelete(nextParams, 'date_to', next.dateTo)
        if ('overdue' in next) setOrDelete(nextParams, 'overdue', next.overdue ? '1' : undefined)
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
