import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  GetExpensesCategory,
  GetExpensesCurrency,
  type GetExpensesParams,
} from '@/api/generated/qASAAPIDocumentation.schemas'

export type ExpenseCategoryFilter = GetExpensesCategory | 'all'
export type ExpenseCurrencyFilter = GetExpensesCurrency | 'all'

export interface ExpensesListState {
  page: number
  category: ExpenseCategoryFilter
  currency: ExpenseCurrencyFilter
  dateFrom: string
  dateTo: string
  year: string
}

/** URL search params are the single source of truth for the expenses list. */
export function useExpensesListState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo<ExpensesListState>(() => {
    const page = Number.parseInt(searchParams.get('page') ?? '', 10)
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      category: (searchParams.get('category') as ExpenseCategoryFilter | null) ?? 'all',
      currency: (searchParams.get('currency') as ExpenseCurrencyFilter | null) ?? 'all',
      dateFrom: searchParams.get('date_from') ?? '',
      dateTo: searchParams.get('date_to') ?? '',
      year: searchParams.get('year') ?? '',
    }
  }, [searchParams])

  const params = useMemo((): GetExpensesParams & { page: number } => {
    const query: GetExpensesParams & { page: number } = { page: state.page, per_page: 20 }
    if (state.category !== 'all') query.category = state.category
    if (state.currency !== 'all') query.currency = state.currency
    if (state.dateFrom) query.date_from = state.dateFrom
    if (state.dateTo) query.date_to = state.dateTo
    if (state.year) query.year = Number(state.year)
    return query
  }, [state])

  const patch = useCallback(
    (next: Partial<Omit<ExpensesListState, 'page'>>) => {
      setSearchParams((previous) => {
        const nextParams = new URLSearchParams(previous)
        nextParams.delete('page')
        if ('category' in next)
          setOrDelete(nextParams, 'category', next.category === 'all' ? undefined : next.category)
        if ('currency' in next)
          setOrDelete(nextParams, 'currency', next.currency === 'all' ? undefined : next.currency)
        if ('dateFrom' in next) setOrDelete(nextParams, 'date_from', next.dateFrom)
        if ('dateTo' in next) setOrDelete(nextParams, 'date_to', next.dateTo)
        if ('year' in next) setOrDelete(nextParams, 'year', next.year)
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
