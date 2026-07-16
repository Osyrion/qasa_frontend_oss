import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { getGetAuthMeMockHandler } from '@/api/generated/authentication/authentication.msw'
import {
  getDeleteAuth2faMockHandler,
  getPostAuth2faConfirmMockHandler,
  getPostAuth2faEnableMockHandler,
} from '@/api/generated/two-factor/two-factor.msw'
import type { User } from '@/api/generated/qASAAPIDocumentation.schemas'
import { useAuthStore } from '@/features/auth/store'
import { server } from '@/test/server'
import { renderApp } from '@/test/utils'

function baseUser(overrides: Partial<User> = {}): User {
  return {
    id: '1',
    name: 'Jan',
    surname: 'Novak',
    full_name: 'Jan Novak',
    email: 'jan@qasa.local',
    locale: 'en',
    has_password: true,
    has_google_auth: false,
    two_factor_enabled: false,
    ...overrides,
  }
}

describe('security settings — two-factor authentication', () => {
  it('enables 2FA after scanning and confirming a code', async () => {
    const user1 = baseUser()
    useAuthStore.getState().setSession('tok-1', user1)
    server.use(
      getGetAuthMeMockHandler(user1),
      getPostAuth2faEnableMockHandler({
        secret: 'ABCD1234',
        otpauth_uri: 'otpauth://totp/Qasa:jan@qasa.local',
        qr_svg: 'data:image/svg+xml;base64,ZmFrZQ==',
      }),
      getPostAuth2faConfirmMockHandler({ recovery_codes: ['code-1', 'code-2'] }),
    )

    renderApp('/settings/security')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Enable 2FA' }))
    expect(await screen.findByText('ABCD1234')).toBeInTheDocument()

    await user.type(screen.getByLabelText('6-digit code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(await screen.findByText('code-1')).toBeInTheDocument()
    expect(screen.getByText('code-2')).toBeInTheDocument()
  })

  it('disables 2FA with password and code', async () => {
    const user1 = baseUser({ two_factor_enabled: true })
    useAuthStore.getState().setSession('tok-1', user1)
    server.use(getGetAuthMeMockHandler(user1), getDeleteAuth2faMockHandler())

    renderApp('/settings/security')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Disable 2FA' }))
    await waitFor(() => expect(screen.getByLabelText('Current password')).toBeInTheDocument())

    await user.type(screen.getByLabelText('Current password'), 'secret123')
    await user.type(screen.getByLabelText('Authentication code or recovery code'), '123456')
    const disableButtons = screen.getAllByRole('button', { name: 'Disable 2FA' })
    await user.click(disableButtons[disableButtons.length - 1])

    await waitFor(() =>
      expect(screen.getByText('Two-factor authentication is disabled.')).toBeInTheDocument(),
    )
  })
})
