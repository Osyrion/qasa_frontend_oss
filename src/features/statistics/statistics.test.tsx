import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  getGetStatisticsHealthMockHandler,
  getGetStatisticsOverviewMockHandler,
  getGetStatisticsPartnersMockHandler,
  getGetStatisticsReceivablesMockHandler,
  getGetStatisticsTablesMockHandler,
} from '@/api/generated/statistics/statistics.msw'
import type { User } from '@/api/generated/qASAAPIDocumentation.schemas'
import { useAuthStore } from '@/features/auth/store'
import { server } from '@/test/server'
import { renderApp } from '@/test/utils'

const testUser: User = {
  id: '1',
  name: 'Test',
  surname: 'User',
  full_name: 'Test User',
  email: 'test@qasa.local',
  locale: 'en',
}

beforeEach(() => {
  useAuthStore.getState().setSession('tok-1', testUser)
  server.use(
    getGetStatisticsOverviewMockHandler({
      data: {
        currency: 'EUR',
        kpi: {
          revenue: {
            this_month: { value: 1000, date_from: '2026-07-01', date_to: '2026-07-31' },
            trend_vs_last_month_percent: 12.5,
            rolling_12m: {
              value: 12000,
              yoy_percent: 5,
              date_from: '2025-08-01',
              date_to: '2026-07-31',
            },
            ytd: { value: 7000, yoy_percent: 3, date_from: '2026-01-01', date_to: '2026-07-16' },
          },
          costs: {
            this_month: { value: 400, date_from: '2026-07-01', date_to: '2026-07-31' },
            trend_vs_last_month_percent: -2,
            rolling_12m: {
              value: 4800,
              yoy_percent: null,
              date_from: '2025-08-01',
              date_to: '2026-07-31',
            },
            ytd: { value: 2800, yoy_percent: null, date_from: '2026-01-01', date_to: '2026-07-16' },
          },
          profit: {
            this_month: { value: 600, date_from: '2026-07-01', date_to: '2026-07-31' },
            trend_vs_last_month_percent: 20,
            rolling_12m: {
              value: 7200,
              yoy_percent: 8,
              date_from: '2025-08-01',
              date_to: '2026-07-31',
            },
            ytd: { value: 4200, yoy_percent: 6, date_from: '2026-01-01', date_to: '2026-07-16' },
            ytd_margin_percent: 60,
          },
        },
        comparison: [],
        monthly_trend: [{ month: '2026-07', revenue: 1000, costs: 400, profit: 600 }],
        profit_chart: { monthly: [], cumulative_ytd: [] },
        assumptions: [],
      },
    }),
    getGetStatisticsTablesMockHandler({
      data: { currency: 'EUR', by_year: [], by_month: [], assumptions: [] },
    }),
    getGetStatisticsReceivablesMockHandler({
      data: {
        as_of: '2026-07-16',
        receivables: {
          EUR: {
            not_yet_due: { amount: 100, count: 1 },
            d1_30: { amount: 0, count: 0 },
            d31_60: { amount: 0, count: 0 },
            d61_90: { amount: 0, count: 0 },
            d90_plus: { amount: 0, count: 0 },
          },
        },
        payables: {},
      },
    }),
    getGetStatisticsPartnersMockHandler({
      data: {
        top_clients: {
          EUR: [{ client_id: 'c1', name: 'Acme s.r.o.', amount: 1000, percent_share: 100 }],
        },
        top_suppliers: {},
        churn_risk: [],
      },
    }),
    getGetStatisticsHealthMockHandler({
      data: {
        currency: 'EUR',
        dso: { days: 12.5, sample_size: 4 },
        payment_morale: { on_time_percent: 80, late_percent: 20, avg_days_late: 3, sample_size: 4 },
        client_concentration: { top1_share_percent: 45, risk_level: 'high', pareto_count: 1 },
        dpo: { days: 20, sample_size: 2 },
        supplier_concentration: { top1_share_percent: null, risk_level: null, pareto_count: null },
        working_capital_cycle_days: -7.5,
      },
    }),
  )
})

describe('statistics page', () => {
  it('renders overview KPI cards and the monthly trend chart', async () => {
    renderApp('/statistics')

    expect(await screen.findByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('Costs')).toBeInTheDocument()
    expect(screen.getByText('Profit')).toBeInTheDocument()
    expect(screen.getByText('Revenue, costs & profit — last 12 months')).toBeInTheDocument()
  })

  it('switches to the partners tab and shows the top client ranking', async () => {
    renderApp('/statistics')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('tab', { name: 'Partners' }))

    expect(await screen.findByText('Acme s.r.o.')).toBeInTheDocument()
  })

  it('switches to the health tab and shows an insufficient-data state for supplier concentration', async () => {
    renderApp('/statistics')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('tab', { name: 'Health' }))

    expect(await screen.findByText('12.5 days')).toBeInTheDocument()
    expect(screen.getByText('Insufficient data for this period.')).toBeInTheDocument()
  })
})
