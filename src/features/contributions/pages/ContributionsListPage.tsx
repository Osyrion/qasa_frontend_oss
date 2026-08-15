import type { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetContributions, useGetContributionsSummary } from '@/api/generated/taxation/taxation'
import {
  GetContributionsType,
  type ContributionPayment,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { ContributionFormSheet } from '@/features/contributions/components/ContributionFormSheet'
import { useContributionsListState } from '@/features/contributions/lib/use-contributions-list-state'
import { DataTable } from '@/shared/components/DataTable'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { asPaginationMeta } from '@/shared/lib/pagination'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const TYPES = Object.values(GetContributionsType)

export function ContributionsListPage() {
  const { t } = useTranslation('contributions')
  const { state, params, patch, setPage } = useContributionsListState()
  const [sheetContributionId, setSheetContributionId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const contributions = useGetContributions(params, {
    query: { placeholderData: (previous) => previous },
  })
  const summary = useGetContributionsSummary(
    { year: Number(state.year) },
    { query: { enabled: Boolean(state.year) } },
  )
  const meta = asPaginationMeta(contributions.data?.meta)

  const openNew = () => {
    setSheetContributionId(null)
    setSheetOpen(true)
  }

  const openEdit = (id: string) => {
    setSheetContributionId(id)
    setSheetOpen(true)
  }

  const columns: ColumnDef<ContributionPayment>[] = [
    {
      id: 'paid_at',
      header: t('list.column_paid_at'),
      enableSorting: false,
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium hover:underline"
          onClick={() => row.original.id && openEdit(row.original.id)}
        >
          <DateText value={row.original.paid_at} variant="date-only" />
        </button>
      ),
    },
    {
      id: 'type',
      header: t('list.column_type'),
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.type ? t(`type.${row.original.type}`) : '—'}
        </Badge>
      ),
    },
    {
      id: 'period',
      header: t('list.column_period'),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.period_month
          ? `${row.original.period_month}/${row.original.period_year}`
          : row.original.period_year,
    },
    {
      id: 'amount',
      header: t('list.column_amount'),
      enableSorting: false,
      cell: ({ row }) => (
        <MoneyText amount={row.original.amount} currency={row.original.currency ?? 'EUR'} />
      ),
    },
  ]

  const totals = summary.data?.totals

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('list.title')}</h1>
        <Button onClick={openNew}>
          <PlusIcon />
          {t('list.new_contribution')}
        </Button>
      </div>

      {totals && (
        <div className="grid grid-cols-3 gap-4">
          {TYPES.map((type) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(`type.${type}`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {Object.entries(totals[type] ?? {}).length === 0 ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  Object.entries(totals[type] ?? {}).map(([currency, amount]) => (
                    <MoneyText key={currency} amount={amount} currency={currency} />
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-44">
          <FieldLabel>{t('list.filter_type')}</FieldLabel>
          <Select
            value={state.type}
            onValueChange={(value) => patch({ type: value as GetContributionsType | 'all' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('list.filter_type_all')}</SelectItem>
              {TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`type.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field className="w-32">
          <FieldLabel>{t('list.filter_year')}</FieldLabel>
          <Input
            type="number"
            value={state.year}
            onChange={(event) => patch({ year: event.target.value })}
          />
        </Field>
      </div>

      <DataTable
        columns={columns}
        data={contributions.data?.data ?? []}
        meta={meta}
        isLoading={contributions.isPending}
        sorting={[]}
        onSortingChange={() => {}}
        onPageChange={setPage}
        emptyMessage={t('list.empty')}
      />

      <ContributionFormSheet
        contributionId={sheetContributionId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
