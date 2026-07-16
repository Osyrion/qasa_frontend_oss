import type { ColumnDef } from '@tanstack/react-table'
import { PaperclipIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetExpenses } from '@/api/generated/expenses/expenses'
import {
  GetExpensesCategory,
  GetExpensesCurrency,
  type Expense,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { ExpenseFormSheet } from '@/features/expenses/components/ExpenseFormSheet'
import { useExpensesListState } from '@/features/expenses/lib/use-expenses-list-state'
import { DataTable } from '@/shared/components/DataTable'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { asPaginationMeta } from '@/shared/lib/pagination'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const CATEGORIES = Object.values(GetExpensesCategory)
const CURRENCIES = Object.values(GetExpensesCurrency)

export function ExpensesListPage() {
  const { t } = useTranslation('expenses')
  const { state, params, patch, setPage } = useExpensesListState()
  const [sheetExpenseId, setSheetExpenseId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const expenses = useGetExpenses(params, { query: { placeholderData: (previous) => previous } })
  const meta = asPaginationMeta(expenses.data?.meta)

  const openNew = () => {
    setSheetExpenseId(null)
    setSheetOpen(true)
  }

  const openEdit = (id: string) => {
    setSheetExpenseId(id)
    setSheetOpen(true)
  }

  const columns: ColumnDef<Expense>[] = [
    {
      id: 'date',
      header: t('list.column_date'),
      enableSorting: false,
      cell: ({ row }) => <DateText value={row.original.date} variant="date-only" />,
    },
    {
      id: 'description',
      header: t('list.column_description'),
      enableSorting: false,
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium hover:underline"
          onClick={() => row.original.id && openEdit(row.original.id)}
        >
          {row.original.description}
        </button>
      ),
    },
    {
      id: 'category',
      header: t('list.column_category'),
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.category ? t(`category.${row.original.category}`) : '—'}
        </Badge>
      ),
    },
    {
      id: 'amount',
      header: t('list.column_amount'),
      enableSorting: false,
      cell: ({ row }) => (
        <MoneyText amount={row.original.amount} currency={row.original.currency ?? 'EUR'} />
      ),
    },
    {
      id: 'attachment',
      header: t('list.column_attachment'),
      enableSorting: false,
      cell: ({ row }) => (row.original.attachment ? <PaperclipIcon className="size-4" /> : null),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('list.title')}</h1>
        <Button onClick={openNew}>
          <PlusIcon />
          {t('list.new_expense')}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-44">
          <FieldLabel>{t('list.filter_category')}</FieldLabel>
          <Select
            value={state.category}
            onValueChange={(value) => patch({ category: value as GetExpensesCategory | 'all' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('list.filter_category_all')}</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {t(`category.${category}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field className="w-36">
          <FieldLabel>{t('list.filter_currency')}</FieldLabel>
          <Select
            value={state.currency}
            onValueChange={(value) => patch({ currency: value as GetExpensesCurrency | 'all' })}
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

        <Field className="w-32">
          <FieldLabel>{t('list.filter_year')}</FieldLabel>
          <Input
            type="number"
            value={state.year}
            onChange={(event) => patch({ year: event.target.value })}
          />
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
        data={expenses.data?.data ?? []}
        meta={meta}
        isLoading={expenses.isPending}
        sorting={[]}
        onSortingChange={() => {}}
        onPageChange={setPage}
        emptyMessage={t('list.empty')}
      />

      <ExpenseFormSheet expenseId={sheetExpenseId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}
