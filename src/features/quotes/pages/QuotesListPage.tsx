import type { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useGetQuotes } from '@/api/generated/quotes/quotes'
import { GetQuotesStatus, type Quote } from '@/api/generated/qASAAPIDocumentation.schemas'
import { ClientSelect } from '@/features/quotes/components/ClientSelect'
import { useQuotesListState } from '@/features/quotes/lib/use-quotes-list-state'
import { DataTable } from '@/shared/components/DataTable'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { asPaginationMeta } from '@/shared/lib/pagination'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const STATUSES = Object.values(GetQuotesStatus)

export function QuotesListPage() {
  const { t } = useTranslation('quotes')
  const { state, params, patch, setPage } = useQuotesListState()

  const quotes = useGetQuotes(params, { query: { placeholderData: (previous) => previous } })
  const meta = asPaginationMeta(quotes.data?.meta)

  const columns: ColumnDef<Quote>[] = [
    {
      id: 'quote_number',
      header: t('list.column_number'),
      enableSorting: false,
      cell: ({ row }) => (
        <Link to={`/quotes/${row.original.id}`} className="font-medium hover:underline">
          {row.original.quote_number ?? t('list.draft_placeholder')}
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
      id: 'status',
      header: t('list.column_status'),
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="secondary">
          {t(`status.${row.original.effective_status ?? row.original.status}`)}
        </Badge>
      ),
    },
    {
      id: 'total',
      header: t('list.column_total'),
      enableSorting: false,
      cell: ({ row }) => (
        <MoneyText amount={row.original.total} currency={row.original.currency ?? 'EUR'} />
      ),
    },
    {
      id: 'valid_until',
      accessorKey: 'valid_until',
      header: t('list.column_valid_until'),
      cell: ({ row }) => <DateText value={row.original.valid_until} variant="date-only" />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('list.title')}</h1>
        <Button asChild>
          <Link to="/quotes/new">
            <PlusIcon />
            {t('list.new_quote')}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-48">
          <FieldLabel>{t('list.filter_status')}</FieldLabel>
          <Select
            value={state.status}
            onValueChange={(value) => patch({ status: value as GetQuotesStatus | 'all' })}
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

        <Field className="w-40">
          <FieldLabel>{t('list.filter_date_from')}</FieldLabel>
          <Input
            type="date"
            value={state.dateFrom}
            onChange={(event) => patch({ dateFrom: event.target.value })}
          />
        </Field>

        <Field className="w-40">
          <FieldLabel>{t('list.filter_date_to')}</FieldLabel>
          <Input
            type="date"
            value={state.dateTo}
            onChange={(event) => patch({ dateTo: event.target.value })}
          />
        </Field>
      </div>

      <DataTable
        columns={columns}
        data={quotes.data?.data ?? []}
        meta={meta}
        isLoading={quotes.isPending}
        sorting={state.sorting}
        onSortingChange={(sorting) => patch({ sorting })}
        onPageChange={setPage}
        emptyMessage={t('list.empty')}
      />
    </div>
  )
}
