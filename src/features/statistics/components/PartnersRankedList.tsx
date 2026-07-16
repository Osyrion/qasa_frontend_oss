import { useTranslation } from 'react-i18next'

import type { PartnerRankingsByCurrency } from '@/features/statistics/lib/types'
import { MoneyText } from '@/shared/components/MoneyText'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface PartnersRankedListProps {
  title: string
  data: PartnerRankingsByCurrency
}

export function PartnersRankedList({ title, data }: PartnersRankedListProps) {
  const currencies = Object.keys(data)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {currencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          currencies.map((currency) => (
            <div key={currency} className="flex flex-col gap-2">
              <div className="text-xs font-medium text-muted-foreground">{currency}</div>
              <ul className="flex flex-col gap-2">
                {(data[currency] ?? []).map((partner) => (
                  <li key={partner.client_id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{partner.name ?? '—'}</span>
                      <MoneyText amount={partner.amount} currency={currency} />
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-foreground"
                        style={{ width: `${Math.min(100, partner.percent_share ?? 0)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

interface ChurnRiskListProps {
  items: {
    client_id: string
    name: string | null
    days_since_last_invoice: number
    lifetime_revenue: number
    currency: string
  }[]
}

export function ChurnRiskList({ items }: ChurnRiskListProps) {
  const { t } = useTranslation('statistics')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('partners.churn_risk')}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('partners.churn_empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.client_id}
                className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-sm"
              >
                <div>
                  <div className="font-medium">{item.name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('partners.days_since_last_invoice', { days: item.days_since_last_invoice })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    {t('partners.lifetime_revenue')}
                  </div>
                  <MoneyText amount={item.lifetime_revenue} currency={item.currency} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
