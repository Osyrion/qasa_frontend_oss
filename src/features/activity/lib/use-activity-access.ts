import { isAxiosError } from 'axios'

import { useGetActivity } from '@/api/generated/activity/activity'

/**
 * Cheap probe so the nav can hide the Activity log link for accounts without
 * `activity.view` — same query the list page itself would run with no
 * filters, so react-query serves the real page from cache when the probe
 * already succeeded.
 */
export function useActivityAccess() {
  const probe = useGetActivity({ per_page: 1 }, { query: { retry: false } })
  const forbidden = isAxiosError(probe.error) && probe.error.response?.status === 403
  return { forbidden, isPending: probe.isPending }
}
