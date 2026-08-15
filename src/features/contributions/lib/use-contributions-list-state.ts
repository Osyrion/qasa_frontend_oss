import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  GetContributionsType,
  type GetContributionsParams,
} from '@/api/generated/qASAAPIDocumentation.schemas'

export type ContributionTypeFilter = GetContributionsType | 'all'

export interface ContributionsListState {
  page: number
  type: ContributionTypeFilter
  year: string
}

/** URL search params are the single source of truth for the contributions list. */
export function useContributionsListState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo<ContributionsListState>(() => {
    const page = Number.parseInt(searchParams.get('page') ?? '', 10)
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      type: (searchParams.get('type') as ContributionTypeFilter | null) ?? 'all',
      year: searchParams.get('year') ?? String(new Date().getFullYear()),
    }
  }, [searchParams])

  const params = useMemo((): GetContributionsParams & { page: number } => {
    const query: GetContributionsParams & { page: number } = { page: state.page, per_page: 20 }
    if (state.type !== 'all') query.type = state.type
    if (state.year) query.year = Number(state.year)
    return query
  }, [state])

  const patch = useCallback(
    (next: Partial<Omit<ContributionsListState, 'page'>>) => {
      setSearchParams((previous) => {
        const nextParams = new URLSearchParams(previous)
        nextParams.delete('page')
        if ('type' in next)
          setOrDelete(nextParams, 'type', next.type === 'all' ? undefined : next.type)
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
