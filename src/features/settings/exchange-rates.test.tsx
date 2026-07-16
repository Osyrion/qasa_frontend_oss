import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  getGetExchangeRatesMockHandler,
  getPostExchangeRatesMockHandler,
} from '@/api/generated/exchange-rates/exchange-rates.msw'
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
})

describe('exchange rates', () => {
  it('shows a delete button only for manual rates, not system rates', async () => {
    server.use(
      getGetExchangeRatesMockHandler({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 2,
        data: [
          {
            id: 'r-1',
            base_currency: 'EUR',
            target_currency: 'CZK',
            rate: 25.1,
            date: '2026-07-16',
            source: 'manual',
          },
          {
            id: 'r-2',
            base_currency: 'EUR',
            target_currency: 'USD',
            rate: 1.1,
            date: '2026-07-16',
            source: 'cnb',
          },
        ],
      }),
    )

    renderApp('/settings/exchange-rates')

    expect(await screen.findByText('EUR/CZK')).toBeInTheDocument()
    expect(screen.getByText('EUR/USD')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Delete this exchange rate?' })).toHaveLength(1)
  })

  it('creates a new manual exchange rate', async () => {
    server.use(
      getGetExchangeRatesMockHandler({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 0,
        data: [],
      }),
    )
    let created = false
    server.use(
      getPostExchangeRatesMockHandler(() => {
        created = true
        return {
          id: 'new-id',
          base_currency: 'EUR',
          target_currency: 'CZK',
          rate: 25.5,
          date: '2026-07-16',
          source: 'manual',
        }
      }),
    )

    renderApp('/settings/exchange-rates')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'New rate' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(screen.getByLabelText('Rate'), '25.5')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(created).toBe(true))
    void dialog
  })
})
