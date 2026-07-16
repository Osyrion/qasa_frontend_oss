import type { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useGetSupplierInvoices } from '@/api/generated/supplier-invoices/supplier-invoices'
import {
  GetSupplierInvoicesStatus,
  type SupplierInvoice,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { VendorSelect } from '@/features/supplier-invoices/components/VendorSelect'
import { useSupplierInvoicesListState } from '@/features/supplier-invoices/lib/use-supplier-invoices-list-state'
import { DataTable } from '@/shared/components/DataTable'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { asPaginationMeta } from '@/shared/lib/pagination'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const STATUSES = Object.values(GetSupplierInvoicesStatus)

export function SupplierInvoicesListPage() {
  const { t } = useTranslation('supplierInvoices')
  const { state, params, patch, setPage } = useSupplierInvoicesListState()

  const supplierInvoices = useGetSupplierInvoices(params, {
    query: { placeholderData: (previous) => previous },
  })
  const meta = asPaginationMeta(supplierInvoices.data?.meta)

  const columns: ColumnDef<SupplierInvoice>[] = [
    {
      id: 'internal_number',
      header: t('list.column_number'),
      enableSorting: false,
      cell: ({ row }) => (
        <Link to={`/supplier-invoices/${row.original.id}`} className="font-medium hover:underline">
          {row.original.internal_number}
        </Link>
      ),
    },
    {
      id: 'client',
      header: t('list.column_vendor'),
      enableSorting: false,
      cell: ({ row }) => row.original.client?.display_name ?? '—',
    },
    {
      id: 'status',
      header: t('list.column_status'),
      enableSorting: false,
      cell: ({ row }) => <Badge variant="secondary">{t(`status.${row.original.status}`)}</Badge>,
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
      header: t('list.column_due_at'),
      enableSorting: false,
      cell: ({ row }) => <DateText value={row.original.due_at} variant="date-only" />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('list.title')}</h1>
        <Button asChild>
          <Link to="/supplier-invoices/new">
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
            onValueChange={(value) => patch({ status: value as GetSupplierInvoicesStatus | 'all' })}
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
          <VendorSelect value={state.clientId} onChange={(clientId) => patch({ clientId })} />
        </Field>

        <Field className="w-56">
          <FieldLabel>{t('list.filter_search')}</FieldLabel>
          <Input value={state.search} onChange={(event) => patch({ search: event.target.value })} />
        </Field>
      </div>

      <DataTable
        columns={columns}
        data={supplierInvoices.data?.data ?? []}
        meta={meta}
        isLoading={supplierInvoices.isPending}
        sorting={[]}
        onSortingChange={() => {}}
        onPageChange={setPage}
        emptyMessage={t('list.empty')}
      />
    </div>
  )
}
