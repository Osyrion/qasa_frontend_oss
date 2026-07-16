import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  getDeleteAuthTokensIdMockHandler,
  getGetAuthTokensMockHandler,
  getPostAuthTokensMockHandler,
} from '@/api/generated/tokens/tokens.msw'
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

describe('API tokens settings', () => {
  it('creates a token and shows the plaintext value once', async () => {
    server.use(
      getGetAuthTokensMockHandler([]),
      getPostAuthTokensMockHandler({ token: 'plaintext-abc123' }),
    )

    renderApp('/settings/tokens')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'New token' }))
    await user.type(screen.getByLabelText('Name'), 'CI script')
    await user.click(screen.getByLabelText('View clients'))
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('plaintext-abc123')).toBeInTheDocument()
  })

  it('revokes an existing token', async () => {
    server.use(
      getGetAuthTokensMockHandler([
        {
          id: 1,
          name: 'Old script',
          abilities: ['clients.view'],
          last_used_at: null,
          created_at: null,
        },
      ]),
      getDeleteAuthTokensIdMockHandler(),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderApp('/settings/tokens')

    expect(await screen.findByText('Old script')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(window.confirm).toHaveBeenCalled()
  })
})
