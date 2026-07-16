import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'

import { AGING_BUCKETS, type AgingByCurrency } from '@/features/statistics/lib/types'
import { formatMoney } from '@/shared/lib/money'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

const BUCKET_COLORS: Record<string, string> = {
  not_yet_due: 'var(--chart-1)',
  d1_30: 'var(--chart-2)',
  d31_60: 'var(--chart-3)',
  d61_90: 'var(--chart-4)',
  d90_plus: 'var(--chart-5)',
}

interface ReceivablesAgingChartProps {
  title: string
  data: AgingByCurrency
}

interface ChartRow {
  currency: string
  [bucket: string]: string | number | undefined
}

function AgingTooltip({ active, payload, label }: TooltipContentProps) {
  const { t, i18n } = useTranslation('statistics')
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border bg-popover p-2 text-xs text-popover-foreground shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      {payload
        .filter((entry) => typeof entry.value === 'number' && entry.value > 0)
        .map((entry) => {
          const bucket = String(entry.dataKey)
          const row = entry.payload as ChartRow
          const count = row[`${bucket}_count`]
          return (
            <div key={bucket} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: entry.color }} />
                {t(`receivables.bucket.${bucket}`)}
              </span>
              <span>
                {formatMoney(Number(entry.value), String(label ?? 'EUR'), i18n.language)}
                {typeof count === 'number' ? ` (${count})` : ''}
              </span>
            </div>
          )
        })}
    </div>
  )
}

export function ReceivablesAgingChart({ title, data }: ReceivablesAgingChartProps) {
  const { t } = useTranslation('statistics')
  const currencies = Object.keys(data)

  if (currencies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">—</p>
        </CardContent>
      </Card>
    )
  }

  const rows: ChartRow[] = currencies.map((currency) => {
    const row: ChartRow = { currency }
    for (const bucket of AGING_BUCKETS) {
      row[bucket] = data[currency]?.[bucket]?.amount ?? 0
      row[`${bucket}_count`] = data[currency]?.[bucket]?.count ?? 0
    }
    return row
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: Math.max(120, currencies.length * 70) }} className="w-full">
          <ResponsiveContainer>
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                dataKey="currency"
                type="category"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={AgingTooltip} />
              <Legend formatter={(value: string) => t(`receivables.bucket.${value}`)} />
              {AGING_BUCKETS.map((bucket) => (
                <Bar
                  key={bucket}
                  dataKey={bucket}
                  stackId="a"
                  fill={BUCKET_COLORS[bucket]}
                  maxBarSize={32}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
