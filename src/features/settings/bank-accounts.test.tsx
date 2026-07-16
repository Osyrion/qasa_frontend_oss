import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  getDeleteBankAccountsIdMockHandler,
  getGetBankAccountsMockHandler,
  getPostBankAccountsMockHandler,
} from '@/api/generated/bank-accounts/bank-accounts.msw'
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

describe('bank accounts settings', () => {
  it('creates a bank account', async () => {
    server.use(
      getGetBankAccountsMockHandler([]),
      getPostBankAccountsMockHandler({
        id: 'ba1',
        label: 'Main account',
        iban: 'SK1234567890123456789012',
        currency: 'EUR',
        is_default: true,
      }),
    )

    renderApp('/settings/bank-accounts')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'New account' }))
    await user.type(screen.getByLabelText('Label'), 'Main account')
    await user.type(screen.getByLabelText('IBAN'), 'SK1234567890123456789012')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('deletes a bank account', async () => {
    server.use(
      getGetBankAccountsMockHandler([
        { id: 'ba1', label: 'Old account', currency: 'EUR', is_default: false },
      ]),
      getDeleteBankAccountsIdMockHandler(),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderApp('/settings/bank-accounts')

    expect(await screen.findByText('Old account')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(window.confirm).toHaveBeenCalled()
  })
})
