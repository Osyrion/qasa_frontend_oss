import { CheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useGetProfileSetupStatus } from '@/api/generated/profile/profile'
import { useGetStatisticsOverview } from '@/api/generated/statistics/statistics'
import type { StatisticsKpiBlock } from '@/api/generated/qASAAPIDocumentation.schemas'
import { MoneyText } from '@/shared/components/MoneyText'
import { cn } from '@/shared/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

const SETUP_LINKS: Record<string, string> = {
  billing_identity: '/settings/profile',
  vat_status: '/settings/profile',
  bank_account: '/settings/bank-accounts',
  invoice_numbering: '/settings/profile',
  logo: '/settings/profile',
  first_client: '/clients/new',
  first_invoice: '/invoices/new',
}

export function DashboardPage() {
  const { t } = useTranslation()
  const overview = useGetStatisticsOverview()
  const setupStatus = useGetProfileSetupStatus()

  const stats = overview.data?.data
  const setup = setupStatus.data?.data

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('nav.dashboard')}</h1>

      {overview.isPending ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      ) : stats?.kpi ? (
        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            title={t('dashboard.kpi_revenue')}
            block={stats.kpi.revenue ?? {}}
            currency={stats.currency ?? 'EUR'}
          />
          <KpiCard
            title={t('dashboard.kpi_costs')}
            block={stats.kpi.costs ?? {}}
            currency={stats.currency ?? 'EUR'}
          />
          <KpiCard
            title={t('dashboard.kpi_profit')}
            block={stats.kpi.profit ?? {}}
            currency={stats.currency ?? 'EUR'}
          />
        </div>
      ) : null}

      {setup && !setup.completed && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.setup_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {(setup.items ?? []).map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border',
                      item.done
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input',
                    )}
                  >
                    {item.done && <CheckIcon className="size-3" />}
                  </span>
                  {item.done || !item.key ? (
                    <span className={cn(item.done && 'text-muted-foreground line-through')}>
                      {t(`dashboard.setup.${item.key}`)}
                    </span>
                  ) : (
                    <Link
                      to={SETUP_LINKS[item.key] ?? '/settings/profile'}
                      className="hover:underline"
                    >
                      {t(`dashboard.setup.${item.key}`)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface KpiCardProps {
  title: string
  block: StatisticsKpiBlock
  currency: string
}

function KpiCard({ title, block, currency }: KpiCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{t('dashboard.this_month')}</div>
          <div className="text-xl font-semibold">
            <MoneyText amount={block.this_month?.value} currency={currency} />
          </div>
          {block.trend_vs_last_month_percent != null && (
            <div className="text-xs text-muted-foreground">
              {formatPercent(block.trend_vs_last_month_percent)} {t('dashboard.vs_last_month')}
            </div>
          )}
        </div>
        <div className="flex justify-between text-sm">
          <div>
            <div className="text-xs text-muted-foreground">{t('dashboard.ytd')}</div>
            <MoneyText amount={block.ytd?.value} currency={currency} />
            {block.ytd?.yoy_percent != null && (
              <div className="text-xs text-muted-foreground">
                {formatPercent(block.ytd.yoy_percent)}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{t('dashboard.rolling_12m')}</div>
            <MoneyText amount={block.rolling_12m?.value} currency={currency} />
            {block.rolling_12m?.yoy_percent != null && (
              <div className="text-xs text-muted-foreground">
                {formatPercent(block.rolling_12m.yoy_percent)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value}%`
}
