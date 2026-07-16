import { useTranslation } from 'react-i18next'

import type {
  GetStatisticsHealth200Data,
  StatisticsConcentration,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface HealthTilesProps {
  data: GetStatisticsHealth200Data
}

export function HealthTiles({ data }: HealthTilesProps) {
  const { t } = useTranslation('statistics')

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('health.dso')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.dso?.sample_size ? (
            <div className="text-2xl font-semibold">
              {data.dso.days} {t('health.days')}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('health.insufficient_data')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('health.dpo')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.dpo?.sample_size ? (
            <div className="text-2xl font-semibold">
              {data.dpo.days} {t('health.days')}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('health.insufficient_data')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('health.working_capital_cycle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.working_capital_cycle_days != null ? (
            <div className="text-2xl font-semibold">
              {data.working_capital_cycle_days} {t('health.days')}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('health.insufficient_data')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('health.payment_morale')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.payment_morale?.sample_size ? (
            <div className="flex flex-col gap-2">
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${data.payment_morale.on_time_percent ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {t('health.on_time')}: {data.payment_morale.on_time_percent}%
                </span>
                <span>
                  {t('health.late')}: {data.payment_morale.late_percent}%
                </span>
              </div>
              {data.payment_morale.avg_days_late != null && (
                <div className="text-xs text-muted-foreground">
                  {t('health.avg_days_late')}: {data.payment_morale.avg_days_late}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('health.insufficient_data')}</p>
          )}
        </CardContent>
      </Card>

      <ConcentrationCard
        title={t('health.client_concentration')}
        concentration={data.client_concentration}
      />
      <ConcentrationCard
        title={t('health.supplier_concentration')}
        concentration={data.supplier_concentration}
      />
    </div>
  )
}

function ConcentrationCard({
  title,
  concentration,
}: {
  title: string
  concentration: StatisticsConcentration | undefined
}) {
  const { t } = useTranslation('statistics')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {concentration?.top1_share_percent != null ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold">{concentration.top1_share_percent}%</span>
              {concentration.risk_level && (
                <Badge variant={concentration.risk_level === 'high' ? 'destructive' : 'secondary'}>
                  {t(`health.risk_level.${concentration.risk_level}`)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t('health.top1_share')}</p>
            {concentration.pareto_count != null && (
              <p className="text-xs text-muted-foreground">
                {t('health.pareto_count')}: {concentration.pareto_count}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('health.insufficient_data')}</p>
        )}
      </CardContent>
    </Card>
  )
}
