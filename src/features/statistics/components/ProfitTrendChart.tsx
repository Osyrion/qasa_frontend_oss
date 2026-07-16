import { useTranslation } from 'react-i18next'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { GetStatisticsOverview200DataMonthlyTrendItem } from '@/api/generated/qASAAPIDocumentation.schemas'
import { formatMoney } from '@/shared/lib/money'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface ProfitTrendChartProps {
  data: GetStatisticsOverview200DataMonthlyTrendItem[]
  currency: string
}

export function ProfitTrendChart({ data, currency }: ProfitTrendChartProps) {
  const { t, i18n } = useTranslation('statistics')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('chart.profit_trend_title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(value: number) => formatMoney(value, currency, i18n.language)}
              />
              <Tooltip
                formatter={(value) => formatMoney(Number(value), currency, i18n.language)}
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--popover-foreground)',
                }}
              />
              <Legend
                formatter={(value: string) =>
                  value === 'revenue'
                    ? t('chart.revenue')
                    : value === 'costs'
                      ? t('chart.costs')
                      : t('chart.profit')
                }
              />
              <Bar dataKey="revenue" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={24} />
              <Bar dataKey="costs" fill="var(--chart-4)" radius={[3, 3, 0, 0]} maxBarSize={24} />
              <Line
                dataKey="profit"
                stroke="var(--foreground)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--foreground)' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
