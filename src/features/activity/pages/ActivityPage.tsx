import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetActivity } from '@/api/generated/activity/activity'
import type { ActivityLog } from '@/api/generated/qASAAPIDocumentation.schemas'
import { useActivityListState } from '@/features/activity/lib/use-activity-list-state'
import { DateText } from '@/shared/components/DateText'
import { asPaginationMeta } from '@/shared/lib/pagination'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

export function ActivityPage() {
  const { t } = useTranslation('activity')
  const { t: tCommon } = useTranslation()
  const { state, params, setPage } = useActivityListState()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const activity = useGetActivity(params, { query: { retry: false } })
  const isForbidden = isAxiosError(activity.error) && activity.error.response?.status === 403
  const meta = asPaginationMeta(activity.data?.meta)
  const rows = activity.data?.data ?? []

  const toggleExpanded = (id: string) => {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (isForbidden) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <h1 className="text-lg font-semibold">{t('forbidden_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('forbidden_body')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      {activity.isPending ? (
        <Spinner />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('column_when')}</TableHead>
              <TableHead>{t('column_actor')}</TableHead>
              <TableHead>{t('column_event')}</TableHead>
              <TableHead>{t('column_subject')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((entry) => (
                <ActivityRow
                  key={entry.id}
                  entry={entry}
                  expanded={entry.id ? expanded.has(entry.id) : false}
                  onToggle={() => entry.id && toggleExpanded(entry.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={state.page <= 1}
            onClick={() => setPage(state.page - 1)}
          >
            {tCommon('data_table.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={state.page >= meta.last_page}
            onClick={() => setPage(state.page + 1)}
          >
            {tCommon('data_table.next')}
          </Button>
        </div>
      )}
    </div>
  )
}

function ActivityRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: ActivityLog
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation('activity')
  const hasChanges = entry.changes != null && Object.keys(entry.changes).length > 0
  const eventKey = `event.${entry.event}`
  const eventLabel = entry.event && t(eventKey, { defaultValue: entry.event })

  return (
    <>
      <TableRow>
        <TableCell>
          <DateText value={entry.created_at} />
        </TableCell>
        <TableCell>{entry.actor_id ?? t('system_actor')}</TableCell>
        <TableCell>{eventLabel}</TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {entry.subject_type} · {entry.subject_id}
        </TableCell>
        <TableCell>
          {hasChanges && (
            <Button variant="ghost" size="sm" onClick={onToggle}>
              {expanded ? t('hide_changes') : t('show_changes')}
            </Button>
          )}
        </TableCell>
      </TableRow>
      {expanded && hasChanges && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/50">
            <ChangesDiff changes={entry.changes as Record<string, unknown>} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function ChangesDiff({ changes }: { changes: Record<string, unknown> }) {
  const { t } = useTranslation('activity')

  if ('from' in changes || 'to' in changes) {
    return (
      <div className="flex gap-4 text-sm">
        <span>
          <span className="text-muted-foreground">{t('change_from')}:</span>{' '}
          {String(changes.from ?? '—')}
        </span>
        <span>
          <span className="text-muted-foreground">{t('change_to')}:</span>{' '}
          {String(changes.to ?? '—')}
        </span>
      </div>
    )
  }

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {Object.entries(changes).map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground">{key}</dt>
          <dd>{String(value)}</dd>
        </div>
      ))}
    </dl>
  )
}
