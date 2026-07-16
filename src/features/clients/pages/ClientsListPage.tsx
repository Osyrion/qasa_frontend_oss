import type { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useGetClients } from '@/api/generated/clients/clients'
import {
  GetClientsClientType,
  GetClientsCurrency,
  GetClientsRole,
  type Client,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { useClientsListState } from '@/features/clients/lib/use-clients-list-state'
import { DataTable } from '@/shared/components/DataTable'
import { DateText } from '@/shared/components/DateText'
import { asPaginationMeta } from '@/shared/lib/pagination'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

export function ClientsListPage() {
  const { t } = useTranslation('clients')
  const { state, params, patch, setPage } = useClientsListState()
  const [searchInput, setSearchInput] = useState(state.search)

  const clients = useGetClients(params, { query: { placeholderData: (previous) => previous } })
  const meta = asPaginationMeta(clients.data?.meta)

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== state.search) {
        patch({ search: searchInput })
      }
    }, 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  useEffect(() => {
    setSearchInput(state.search)
  }, [state.search])

  const columns: ColumnDef<Client>[] = [
    {
      id: 'display_name',
      header: t('list.column_name'),
      enableSorting: false,
      cell: ({ row }) => (
        <Link to={`/clients/${row.original.id}`} className="font-medium hover:underline">
          {row.original.display_name}
        </Link>
      ),
    },
    {
      id: 'client_type',
      header: t('list.column_type'),
      enableSorting: false,
      cell: ({ row }) => <span>{t(`client_type.${row.original.client_type}`)}</span>,
    },
    {
      id: 'email',
      header: t('list.column_email'),
      enableSorting: false,
      cell: ({ row }) => row.original.email ?? '—',
    },
    {
      id: 'role',
      header: t('list.column_role'),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.is_customer && <Badge variant="secondary">{t('role.customer')}</Badge>}
          {row.original.is_vendor && <Badge variant="outline">{t('role.vendor')}</Badge>}
        </div>
      ),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: t('list.column_created_at'),
      cell: ({ row }) => <DateText value={row.original.created_at} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('list.title')}</h1>
        <Button asChild>
          <Link to="/clients/new">
            <PlusIcon />
            {t('list.new_client')}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('list.search_placeholder')}
          className="max-w-xs"
          aria-label={t('list.search_placeholder')}
        />
        <Select
          value={state.role}
          onValueChange={(value) => patch({ role: value as GetClientsRole })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GetClientsRole.all}>{t('list.filter_role_all')}</SelectItem>
            <SelectItem value={GetClientsRole.customer}>{t('role.customer')}</SelectItem>
            <SelectItem value={GetClientsRole.vendor}>{t('role.vendor')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={state.clientType}
          onValueChange={(value) => patch({ clientType: value as GetClientsClientType | 'all' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('list.filter_type_all')}</SelectItem>
            <SelectItem value={GetClientsClientType.individual}>
              {t('client_type.individual')}
            </SelectItem>
            <SelectItem value={GetClientsClientType.self_employed}>
              {t('client_type.self_employed')}
            </SelectItem>
            <SelectItem value={GetClientsClientType.company}>{t('client_type.company')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={state.currency}
          onValueChange={(value) => patch({ currency: value as GetClientsCurrency | 'all' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('list.filter_currency_all')}</SelectItem>
            <SelectItem value={GetClientsCurrency.CZK}>CZK</SelectItem>
            <SelectItem value={GetClientsCurrency.EUR}>EUR</SelectItem>
            <SelectItem value={GetClientsCurrency.USD}>USD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={clients.data?.data ?? []}
        meta={meta}
        isLoading={clients.isPending}
        sorting={state.sorting}
        onSortingChange={(sorting) => patch({ sorting })}
        onPageChange={setPage}
        emptyMessage={t('list.empty')}
      />
    </div>
  )
}
