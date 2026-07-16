import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  GetSupplierInvoicesStatus,
  type GetSupplierInvoicesParams,
} from '@/api/generated/qASAAPIDocumentation.schemas'

export type SupplierInvoiceStatusFilter = GetSupplierInvoicesStatus | 'all'

export interface SupplierInvoicesListState {
  page: number
  status: SupplierInvoiceStatusFilter
  clientId: string
  search: string
}

/** URL search params are the single source of truth for the supplier invoices list. */
export function useSupplierInvoicesListState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo<SupplierInvoicesListState>(() => {
    const page = Number.parseInt(searchParams.get('page') ?? '', 10)
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      status: (searchParams.get('status') as SupplierInvoiceStatusFilter | null) ?? 'all',
      clientId: searchParams.get('client_id') ?? '',
      search: searchParams.get('search') ?? '',
    }
  }, [searchParams])

  const params = useMemo((): GetSupplierInvoicesParams & { page: number } => {
    const query: GetSupplierInvoicesParams & { page: number } = { page: state.page, per_page: 20 }
    if (state.status !== 'all') query.status = state.status
    if (state.clientId) query.client_id = state.clientId
    if (state.search) query.search = state.search
    return query
  }, [state])

  const patch = useCallback(
    (next: Partial<Omit<SupplierInvoicesListState, 'page'>>) => {
      setSearchParams((previous) => {
        const nextParams = new URLSearchParams(previous)
        nextParams.delete('page')
        if ('status' in next)
          setOrDelete(nextParams, 'status', next.status === 'all' ? undefined : next.status)
        if ('clientId' in next) setOrDelete(nextParams, 'client_id', next.clientId)
        if ('search' in next) setOrDelete(nextParams, 'search', next.search)
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
