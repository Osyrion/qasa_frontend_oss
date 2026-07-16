import type { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useGetRecurringInvoiceTemplates } from '@/api/generated/recurring-invoice-templates/recurring-invoice-templates'
import {
  GetRecurringInvoiceTemplatesStatus,
  type RecurringInvoiceTemplate,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { ClientSelect } from '@/features/recurring/components/ClientSelect'
import { DeleteTemplateButton } from '@/features/recurring/components/DeleteTemplateButton'
import { PauseResumeButton } from '@/features/recurring/components/PauseResumeButton'
import { useRecurringListState } from '@/features/recurring/lib/use-recurring-list-state'
import { DataTable } from '@/shared/components/DataTable'
import { DateText } from '@/shared/components/DateText'
import { asPaginationMeta } from '@/shared/lib/pagination'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const STATUSES = Object.values(GetRecurringInvoiceTemplatesStatus)

export function RecurringListPage() {
  const { t } = useTranslation('recurring')
  const { state, params, patch, setPage } = useRecurringListState()

  const templates = useGetRecurringInvoiceTemplates(params, {
    query: { placeholderData: (previous) => previous },
  })
  const meta = asPaginationMeta(templates.data?.meta)

  const columns: ColumnDef<RecurringInvoiceTemplate>[] = [
    {
      id: 'name',
      header: t('list.column_name'),
      enableSorting: false,
      cell: ({ row }) => (
        <Link to={`/recurring/${row.original.id}/edit`} className="font-medium hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'client',
      header: t('list.column_client'),
      enableSorting: false,
      cell: ({ row }) => row.original.client?.display_name ?? '—',
    },
    {
      id: 'period',
      header: t('list.column_period'),
      enableSorting: false,
      cell: ({ row }) => (row.original.period ? t(`period.${row.original.period}`) : '—'),
    },
    {
      id: 'next_run_date',
      header: t('list.column_next_run'),
      enableSorting: false,
      cell: ({ row }) => <DateText value={row.original.next_run_date} variant="date-only" />,
    },
    {
      id: 'last_generated_at',
      header: t('list.column_last_generated'),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.last_generated_at ? (
          <DateText value={row.original.last_generated_at} variant="date-only" />
        ) : (
          t('list.never')
        ),
    },
    {
      id: 'status',
      header: t('list.column_status'),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{t(`status.${row.original.status}`)}</Badge>
          {row.original.auto_send && <Badge variant="outline">{t('form.auto_send')}</Badge>}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <PauseResumeButton template={row.original} />
          <DeleteTemplateButton template={row.original} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('list.title')}</h1>
        <Button asChild>
          <Link to="/recurring/new">
            <PlusIcon />
            {t('list.new_template')}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-48">
          <FieldLabel>{t('list.filter_status')}</FieldLabel>
          <Select
            value={state.status}
            onValueChange={(value) =>
              patch({ status: value as GetRecurringInvoiceTemplatesStatus | 'all' })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('list.filter_status_all')}</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field className="w-56">
          <FieldLabel>{t('list.filter_client')}</FieldLabel>
          <ClientSelect value={state.clientId} onChange={(clientId) => patch({ clientId })} />
        </Field>
      </div>

      <DataTable
        columns={columns}
        data={templates.data?.data ?? []}
        meta={meta}
        isLoading={templates.isPending}
        sorting={[]}
        onSortingChange={() => {}}
        onPageChange={setPage}
        emptyMessage={t('list.empty')}
      />
    </div>
  )
}
