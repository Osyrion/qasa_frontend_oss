import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { getPostAuthLoginMockHandler } from '@/api/generated/authentication/authentication.msw'
import { getPostAuth2faVerifyMockHandler } from '@/api/generated/two-factor/two-factor.msw'
import type { User } from '@/api/generated/qASAAPIDocumentation.schemas'
import { useAuthStore } from '@/features/auth/store'
import { hardRedirect } from '@/shared/lib/hard-redirect'
import { server } from '@/test/server'
import { renderApp } from '@/test/utils'

vi.mock('@/shared/lib/hard-redirect', () => ({ hardRedirect: vi.fn() }))

const testUser: User = {
  id: '1',
  name: 'Test',
  surname: 'User',
  full_name: 'Test User',
  email: 'test@qasa.local',
  locale: 'en',
}

describe('login', () => {
  it('stores the session and redirects to the dashboard on success', async () => {
    server.use(getPostAuthLoginMockHandler({ token: 'tok-1', user: testUser }))
    const { router } = renderApp('/login')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('E-mail'), 'test@qasa.local')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(useAuthStore.getState().token).toBe('tok-1'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
  })

  it('maps a 422 response onto the field', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          { message: 'Invalid.', errors: { email: ['These credentials do not match.'] } },
          { status: 422 },
        ),
      ),
    )
    renderApp('/login')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('E-mail'), 'test@qasa.local')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('These credentials do not match.')).toBeInTheDocument()
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('shows the expired-session banner for /login?expired=1', () => {
    renderApp('/login?expired=1')

    expect(screen.getByText('Your session has expired. Please sign in again.')).toBeInTheDocument()
  })
})

describe('two-factor login', () => {
  it('continues the login on /login/2fa and completes with a code', async () => {
    server.use(
      getPostAuthLoginMockHandler({ two_factor_required: true, challenge_token: 'ch-1' }),
      getPostAuth2faVerifyMockHandler({ token: 'tok-2', user: testUser }),
    )
    const { router } = renderApp('/login')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('E-mail'), 'test@qasa.local')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await user.type(await screen.findByLabelText('Verification code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() => expect(useAuthStore.getState().token).toBe('tok-2'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
  })

  it('switches between authenticator code and recovery code', async () => {
    useAuthStore.getState().setChallengeToken('ch-1')
    renderApp('/login/2fa')
    const user = userEvent.setup()

    expect(screen.getByLabelText('Verification code')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Use a recovery code' }))
    expect(screen.getByLabelText('Recovery code')).toBeInTheDocument()
  })

  it('redirects to /login when there is no pending challenge', async () => {
    const { router } = renderApp('/login/2fa')

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})

describe('register', () => {
  it('shows the disabled state when the backend returns 404 (QASA_REGISTRATION=false)', async () => {
    server.use(
      http.post('*/api/v1/auth/register', () =>
        HttpResponse.json({ message: 'Not found.' }, { status: 404 }),
      ),
    )
    renderApp('/register')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('First name'), 'Test')
    await user.type(screen.getByLabelText('Last name'), 'User')
    await user.type(screen.getByLabelText('E-mail'), 'new@qasa.local')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByText('Registration is disabled')).toBeInTheDocument()
  })
})

describe('reset password', () => {
  it('submits the new password and returns to login', async () => {
    server.use(
      http.post('*/api/v1/auth/reset-password', () => HttpResponse.json({ message: 'ok' })),
    )
    const { router } = renderApp('/reset-password?token=abc&email=test%40qasa.local')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('New password'), 'new-password-1')
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password-1')
    await user.click(screen.getByRole('button', { name: 'Set new password' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('shows the invalid-link state when token or email is missing', () => {
    renderApp('/reset-password')

    expect(screen.getByText('Invalid link')).toBeInTheDocument()
  })
})

describe('expired token', () => {
  it('clears the session and hard-redirects to /login?expired=1 on a 401', async () => {
    useAuthStore.getState().setSession('stale-token', testUser)
    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
    )

    renderApp('/dashboard')

    await waitFor(() => expect(vi.mocked(hardRedirect)).toHaveBeenCalledWith('/login?expired=1'))
    expect(useAuthStore.getState().token).toBeNull()
  })
})
