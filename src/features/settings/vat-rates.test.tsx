import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  getDeleteVatRatesIdMockHandler,
  getGetVatRatesMockHandler,
  getPostVatRatesMockHandler,
} from '@/api/generated/vat-rates/vat-rates.msw'
import type { User } from '@/api/generated/qASAAPIDocumentation.schemas'
import { useAuthStore } from '@/features/auth/store'
import { server } from '@/test/server'
import { renderApp } from '@/test/utils'

const testUser: User = {
  id: '1',
  name: 'Jan',
  surname: 'Novak',
  full_name: 'Jan Novak',
  email: 'jan@qasa.local',
  locale: 'en',
}

beforeEach(() => {
  useAuthStore.getState().setSession('tok-1', testUser)
})

describe('VAT rates settings', () => {
  it('creates a VAT rate', async () => {
    server.use(
      getGetVatRatesMockHandler([]),
      getPostVatRatesMockHandler({
        id: 'vr1',
        code: 'standard',
        country: 'SK',
        rate: 20,
        is_default: true,
      }),
    )

    renderApp('/settings/vat-rates')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'New rate' }))
    await user.type(screen.getByLabelText('Code'), 'standard')
    await user.type(screen.getByLabelText('Country (ISO-2)'), 'SK')
    await user.type(screen.getByLabelText('Rate (%)'), '20')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('deletes a VAT rate', async () => {
    server.use(
      getGetVatRatesMockHandler([
        { id: 'vr1', code: 'reduced', country: 'SK', rate: 10, is_default: false },
      ]),
      getDeleteVatRatesIdMockHandler(),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderApp('/settings/vat-rates')

    expect(await screen.findByText('reduced')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(window.confirm).toHaveBeenCalled()
  })
})
