import type { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useGetOrders } from '@/api/generated/orders/orders'
import { GetOrdersStatus, type Order } from '@/api/generated/qASAAPIDocumentation.schemas'
import { ClientSelect } from '@/features/orders/components/ClientSelect'
import { useOrdersListState } from '@/features/orders/lib/use-orders-list-state'
import { DataTable } from '@/shared/components/DataTable'
import { asPaginationMeta } from '@/shared/lib/pagination'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const STATUSES = Object.values(GetOrdersStatus)

export function OrdersListPage() {
  const { t } = useTranslation('orders')
  const { state, params, patch, setPage } = useOrdersListState()

  const orders = useGetOrders(params, { query: { placeholderData: (previous) => previous } })
  const meta = asPaginationMeta(orders.data?.meta)

  const columns: ColumnDef<Order>[] = [
    {
      id: 'name',
      header: t('list.column_name'),
      enableSorting: false,
      cell: ({ row }) => (
        <Link
          to={`/orders/${row.original.id}`}
          className="flex items-center gap-2 font-medium hover:underline"
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: row.original.color ?? '#94a3b8' }}
          />
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'client',
      header: t('list.column_client'),
      enableSorting: false,
      cell: ({ row }) => row.original.client?.display_name ?? t('list.personal_placeholder'),
    },
    {
      id: 'status',
      header: t('list.column_status'),
      enableSorting: false,
      cell: ({ row }) => <Badge variant="secondary">{t(`status.${row.original.status}`)}</Badge>,
    },
    {
      id: 'billing_type',
      header: t('list.column_billing_type'),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.billing_type ? t(`billing_type.${row.original.billing_type}`) : '—',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('list.title')}</h1>
        <Button asChild>
          <Link to="/orders/new">
            <PlusIcon />
            {t('list.new_order')}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-48">
          <FieldLabel>{t('list.filter_status')}</FieldLabel>
          <Select
            value={state.status}
            onValueChange={(value) => patch({ status: value as GetOrdersStatus | 'all' })}
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
        data={orders.data?.data ?? []}
        meta={meta}
        isLoading={orders.isPending}
        sorting={state.sorting}
        onSortingChange={(sorting) => patch({ sorting })}
        onPageChange={setPage}
        emptyMessage={t('list.empty')}
      />
    </div>
  )
}
