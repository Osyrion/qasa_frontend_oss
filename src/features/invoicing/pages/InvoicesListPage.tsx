import type { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useGetInvoices } from '@/api/generated/invoices/invoices'
import {
  GetInvoicesCurrency,
  GetInvoicesStatus,
  type Invoice,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { ClientSelect } from '@/features/invoicing/components/ClientSelect'
import { useInvoicesListState } from '@/features/invoicing/lib/use-invoices-list-state'
import { DataTable } from '@/shared/components/DataTable'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { asPaginationMeta } from '@/shared/lib/pagination'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const STATUSES = Object.values(GetInvoicesStatus)
const CURRENCIES = Object.values(GetInvoicesCurrency)

export function InvoicesListPage() {
  const { t } = useTranslation('invoices')
  const { state, params, patch, setPage } = useInvoicesListState()

  const invoices = useGetInvoices(params, { query: { placeholderData: (previous) => previous } })
  const meta = asPaginationMeta(invoices.data?.meta)

  const columns: ColumnDef<Invoice>[] = [
    {
      id: 'invoice_number',
      header: t('list.column_number'),
      enableSorting: false,
      cell: ({ row }) => (
        <Link to={`/invoices/${row.original.id}`} className="font-medium hover:underline">
          {row.original.invoice_number ?? t('list.draft_placeholder')}
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
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{t(`status.${row.original.status}`)}</Badge>
          {row.original.is_overdue && <Badge variant="destructive">{t('list.overdue')}</Badge>}
        </div>
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
      id: 'due_at',
      accessorKey: 'due_at',
      header: t('list.column_due_at'),
      cell: ({ row }) => <DateText value={row.original.due_at} variant="date-only" />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('list.title')}</h1>
        <Button asChild>
          <Link to="/invoices/new">
            <PlusIcon />
            {t('list.new_invoice')}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-48">
          <FieldLabel>{t('list.filter_status')}</FieldLabel>
          <Select
            value={state.status}
            onValueChange={(value) => patch({ status: value as GetInvoicesStatus | 'all' })}
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

        <Field className="w-36">
          <FieldLabel>{t('list.filter_currency')}</FieldLabel>
          <Select
            value={state.currency}
            onValueChange={(value) => patch({ currency: value as GetInvoicesCurrency | 'all' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('list.filter_currency_all')}</SelectItem>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        <Field orientation="horizontal">
          <Checkbox
            id="overdue"
            checked={state.overdue}
            onCheckedChange={(checked) => patch({ overdue: checked === true })}
          />
          <FieldLabel htmlFor="overdue">{t('list.filter_overdue')}</FieldLabel>
        </Field>
      </div>

      <DataTable
        columns={columns}
        data={invoices.data?.data ?? []}
        meta={meta}
        isLoading={invoices.isPending}
        sorting={state.sorting}
        onSortingChange={(sorting) => patch({ sorting })}
        onPageChange={setPage}
        emptyMessage={t('list.empty')}
      />
    </div>
  )
}
