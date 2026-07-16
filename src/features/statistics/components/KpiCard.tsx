import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { StatisticsKpiBlock } from '@/api/generated/qASAAPIDocumentation.schemas'
import { MoneyText } from '@/shared/components/MoneyText'
import { cn } from '@/shared/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface KpiCardProps {
  title: string
  block: StatisticsKpiBlock
  currency: string
}

function TrendBadge({ percent, label }: { percent: number | null | undefined; label: string }) {
  if (percent == null) return null
  const isPositive = percent > 0
  const isNegative = percent < 0

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs',
        isPositive && 'text-foreground',
        isNegative && 'text-destructive',
        !isPositive && !isNegative && 'text-muted-foreground',
      )}
    >
      {isPositive && <TrendingUpIcon className="size-3" />}
      {isNegative && <TrendingDownIcon className="size-3" />}
      <span>
        {percent > 0 ? '+' : ''}
        {percent}% {label}
      </span>
    </div>
  )
}

export function KpiCard({ title, block, currency }: KpiCardProps) {
  const { t } = useTranslation('statistics')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{t('kpi.this_month')}</div>
          <div className="text-xl font-semibold">
            <MoneyText amount={block.this_month?.value} currency={currency} />
          </div>
          <TrendBadge percent={block.trend_vs_last_month_percent} label={t('kpi.vs_last_month')} />
        </div>
        <div className="flex justify-between text-sm">
          <div>
            <div className="text-xs text-muted-foreground">{t('kpi.ytd')}</div>
            <MoneyText amount={block.ytd?.value} currency={currency} />
            <TrendBadge percent={block.ytd?.yoy_percent} label={t('kpi.yoy')} />
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{t('kpi.rolling_12m')}</div>
            <MoneyText amount={block.rolling_12m?.value} currency={currency} />
            <TrendBadge percent={block.rolling_12m?.yoy_percent} label={t('kpi.yoy')} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
