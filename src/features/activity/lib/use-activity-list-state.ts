import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import type { GetActivityParams } from '@/api/generated/qASAAPIDocumentation.schemas'

export interface ActivityListState {
  page: number
  subjectType: string
  subjectId: string
}

export function useActivityListState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo<ActivityListState>(() => {
    const page = Number.parseInt(searchParams.get('page') ?? '', 10)
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      subjectType: searchParams.get('subject_type') ?? '',
      subjectId: searchParams.get('subject_id') ?? '',
    }
  }, [searchParams])

  const params = useMemo((): GetActivityParams & { page: number } => {
    const query: GetActivityParams & { page: number } = { page: state.page, per_page: 20 }
    if (state.subjectType) query.subject_type = state.subjectType
    if (state.subjectId) query.subject_id = state.subjectId
    return query
  }, [state])

  const setPage = useCallback(
    (page: number) => {
      setSearchParams((previous) => {
        const nextParams = new URLSearchParams(previous)
        if (page > 1) nextParams.set('page', String(page))
        else nextParams.delete('page')
        return nextParams
      })
    },
    [setSearchParams],
  )

  return { state, params, setPage }
}
