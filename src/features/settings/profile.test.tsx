import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import {
  getGetAuthMeMockHandler,
  getPutAuthProfileMockHandler,
} from '@/api/generated/authentication/authentication.msw'
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
  default_currency: 'EUR',
  country: 'SK',
  has_password: true,
  has_google_auth: false,
  two_factor_enabled: false,
}

beforeEach(() => {
  useAuthStore.getState().setSession('tok-1', testUser)
  server.use(getGetAuthMeMockHandler(testUser))
})

describe('profile settings', () => {
  it('saves profile changes and reflects the server response', async () => {
    server.use(
      getPutAuthProfileMockHandler(async (info) => {
        const body = (await info.request.json()) as Partial<User>
        return { ...testUser, ...body }
      }),
    )

    renderApp('/settings/profile')
    const user = userEvent.setup()

    const nameInput = await screen.findByLabelText('First name')
    // The form is reset once GET auth/me resolves — wait for that before typing,
    // or a race with the reset can wipe out what was just typed.
    await waitFor(() => expect(nameInput).toHaveValue('Jan'))
    await user.clear(nameInput)
    await user.type(nameInput, 'Jana')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByDisplayValue('Jana')).toBeInTheDocument()
  })

  it('maps a 422 response onto the e-mail field', async () => {
    server.use(
      http.put('*/api/v1/auth/profile', () =>
        HttpResponse.json(
          {
            message: 'Validation failed.',
            errors: { email: ['The email must be a valid email.'] },
          },
          { status: 422 },
        ),
      ),
    )

    renderApp('/settings/profile')
    const user = userEvent.setup()

    await screen.findByLabelText('First name')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('The email must be a valid email.')).toBeInTheDocument()
  })

  it('requires a password confirmation before deleting the account', async () => {
    renderApp('/settings/profile')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete account' }))
    await waitFor(() => expect(screen.getByLabelText('Current password')).toBeInTheDocument())

    const confirmButtons = screen.getAllByRole('button', { name: 'Delete account' })
    const dialogConfirm = confirmButtons[confirmButtons.length - 1]
    expect(dialogConfirm).toBeDisabled()

    await user.type(screen.getByLabelText('Current password'), 'secret123')
    expect(dialogConfirm).toBeEnabled()
  })
})
