import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  GetRecurringInvoiceTemplatesStatus,
  type GetRecurringInvoiceTemplatesParams,
} from '@/api/generated/qASAAPIDocumentation.schemas'

export type RecurringStatusFilter = GetRecurringInvoiceTemplatesStatus | 'all'

export interface RecurringListState {
  page: number
  status: RecurringStatusFilter
  clientId: string
}

/** URL search params are the single source of truth for the recurring templates list. */
export function useRecurringListState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo<RecurringListState>(() => {
    const page = Number.parseInt(searchParams.get('page') ?? '', 10)
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      status: (searchParams.get('status') as RecurringStatusFilter | null) ?? 'all',
      clientId: searchParams.get('client_id') ?? '',
    }
  }, [searchParams])

  const params = useMemo((): GetRecurringInvoiceTemplatesParams & { page: number } => {
    const query: GetRecurringInvoiceTemplatesParams & { page: number } = {
      page: state.page,
      per_page: 20,
    }
    if (state.status !== 'all') query.status = state.status
    if (state.clientId) query.client_id = state.clientId
    return query
  }, [state])

  const patch = useCallback(
    (next: Partial<Omit<RecurringListState, 'page'>>) => {
      setSearchParams((previous) => {
        const nextParams = new URLSearchParams(previous)
        nextParams.delete('page')
        if ('status' in next)
          setOrDelete(nextParams, 'status', next.status === 'all' ? undefined : next.status)
        if ('clientId' in next) setOrDelete(nextParams, 'client_id', next.clientId)
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
