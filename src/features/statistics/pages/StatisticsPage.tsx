import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  useGetStatisticsHealth,
  useGetStatisticsOverview,
  useGetStatisticsPartners,
  useGetStatisticsReceivables,
} from '@/api/generated/statistics/statistics'
import {
  ChurnRiskList,
  PartnersRankedList,
} from '@/features/statistics/components/PartnersRankedList'
import { HealthTiles } from '@/features/statistics/components/HealthTiles'
import { KpiCard } from '@/features/statistics/components/KpiCard'
import { ProfitTrendChart } from '@/features/statistics/components/ProfitTrendChart'
import { ReceivablesAgingChart } from '@/features/statistics/components/ReceivablesAgingChart'
import { StatisticsTables } from '@/features/statistics/components/StatisticsTables'
import type { AgingByCurrency, PartnerRankingsByCurrency } from '@/features/statistics/lib/types'
import { Spinner } from '@/shared/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

export function StatisticsPage() {
  const { t } = useTranslation('statistics')
  const [tablesYear, setTablesYear] = useState(new Date().getFullYear())

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="tables">{t('tabs.tables')}</TabsTrigger>
          <TabsTrigger value="receivables">{t('tabs.receivables')}</TabsTrigger>
          <TabsTrigger value="partners">{t('tabs.partners')}</TabsTrigger>
          <TabsTrigger value="health">{t('tabs.health')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="tables">
          <StatisticsTables year={tablesYear} onYearChange={setTablesYear} />
        </TabsContent>
        <TabsContent value="receivables">
          <ReceivablesTab />
        </TabsContent>
        <TabsContent value="partners">
          <PartnersTab />
        </TabsContent>
        <TabsContent value="health">
          <HealthTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OverviewTab() {
  const { t } = useTranslation('statistics')
  const overview = useGetStatisticsOverview()
  const stats = overview.data?.data

  if (overview.isPending) return <Spinner />
  if (!stats) return null

  const currency = stats.currency ?? 'EUR'

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard title={t('kpi.revenue')} block={stats.kpi?.revenue ?? {}} currency={currency} />
        <KpiCard title={t('kpi.costs')} block={stats.kpi?.costs ?? {}} currency={currency} />
        <KpiCard title={t('kpi.profit')} block={stats.kpi?.profit ?? {}} currency={currency} />
      </div>
      <ProfitTrendChart data={stats.monthly_trend ?? []} currency={currency} />
    </div>
  )
}

function ReceivablesTab() {
  const { t } = useTranslation('statistics')
  const receivables = useGetStatisticsReceivables()
  const data = receivables.data?.data

  if (receivables.isPending) return <Spinner />
  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t('receivables.as_of')}: {data.as_of}
      </p>
      <ReceivablesAgingChart
        title={t('receivables.receivables')}
        data={(data.receivables ?? {}) as AgingByCurrency}
      />
      <ReceivablesAgingChart
        title={t('receivables.payables')}
        data={(data.payables ?? {}) as AgingByCurrency}
      />
    </div>
  )
}

function PartnersTab() {
  const { t } = useTranslation('statistics')
  const partners = useGetStatisticsPartners()
  const data = partners.data?.data

  if (partners.isPending) return <Spinner />
  if (!data) return null

  return (
    <div className="grid grid-cols-2 gap-4">
      <PartnersRankedList
        title={t('partners.top_clients')}
        data={(data.top_clients ?? {}) as PartnerRankingsByCurrency}
      />
      <PartnersRankedList
        title={t('partners.top_suppliers')}
        data={(data.top_suppliers ?? {}) as PartnerRankingsByCurrency}
      />
      <div className="col-span-2">
        <ChurnRiskList
          items={(data.churn_risk ?? []).map((item) => ({
            client_id: item.client_id ?? '',
            name: item.name ?? null,
            days_since_last_invoice: item.days_since_last_invoice ?? 0,
            lifetime_revenue: item.lifetime_revenue ?? 0,
            currency: item.currency ?? 'EUR',
          }))}
        />
      </div>
    </div>
  )
}

function HealthTab() {
  const health = useGetStatisticsHealth()
  const data = health.data?.data

  if (health.isPending) return <Spinner />
  if (!data) return null

  return <HealthTiles data={data} />
}
