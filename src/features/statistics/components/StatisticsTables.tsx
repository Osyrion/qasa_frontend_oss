import { useTranslation } from 'react-i18next'

import { useGetStatisticsTables } from '@/api/generated/statistics/statistics'
import { MoneyText } from '@/shared/components/MoneyText'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Spinner } from '@/shared/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

interface StatisticsTablesProps {
  year: number
  onYearChange: (year: number) => void
}

export function StatisticsTables({ year, onYearChange }: StatisticsTablesProps) {
  const { t } = useTranslation('statistics')
  const tables = useGetStatisticsTables({ year })
  const data = tables.data?.data
  const currency = data?.currency ?? 'EUR'

  const years = data?.by_year?.map((row) => row.year).filter((y): y is number => y != null) ?? []
  if (!years.includes(year)) years.push(year)
  years.sort((a, b) => b - a)

  if (tables.isPending) {
    return <Spinner />
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('tables.by_year')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tables.year')}</TableHead>
                <TableHead>{t('tables.column_revenue')}</TableHead>
                <TableHead>{t('tables.column_costs')}</TableHead>
                <TableHead>{t('tables.column_profit')}</TableHead>
                <TableHead>{t('tables.column_margin')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.by_year ?? []).map((row) => (
                <TableRow key={row.year}>
                  <TableCell>{row.year}</TableCell>
                  <TableCell>
                    <MoneyText amount={row.revenue} currency={currency} />
                  </TableCell>
                  <TableCell>
                    <MoneyText amount={row.costs} currency={currency} />
                  </TableCell>
                  <TableCell>
                    <MoneyText amount={row.profit} currency={currency} />
                  </TableCell>
                  <TableCell>
                    {row.margin_percent != null ? `${row.margin_percent}%` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>{t('tables.by_month')}</CardTitle>
          <Select value={String(year)} onValueChange={(value) => onYearChange(Number(value))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tables.column_period')}</TableHead>
                <TableHead>{t('tables.column_revenue')}</TableHead>
                <TableHead>{t('tables.column_costs')}</TableHead>
                <TableHead>{t('tables.column_profit')}</TableHead>
                <TableHead>{t('tables.column_margin')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.by_month ?? []).map((row) => (
                <TableRow key={row.month}>
                  <TableCell>{row.month}</TableCell>
                  <TableCell>
                    <MoneyText amount={row.revenue} currency={currency} />
                  </TableCell>
                  <TableCell>
                    <MoneyText amount={row.costs} currency={currency} />
                  </TableCell>
                  <TableCell>
                    <MoneyText amount={row.profit} currency={currency} />
                  </TableCell>
                  <TableCell>
                    {row.margin_percent != null ? `${row.margin_percent}%` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
