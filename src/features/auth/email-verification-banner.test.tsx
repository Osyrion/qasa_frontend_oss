import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { getGetProfileSetupStatusMockHandler } from '@/api/generated/profile/profile.msw'
import type { User } from '@/api/generated/qASAAPIDocumentation.schemas'
import { getGetStatisticsOverviewMockHandler } from '@/api/generated/statistics/statistics.msw'
import { useAuthStore } from '@/features/auth/store'
import { server } from '@/test/server'
import { renderApp } from '@/test/utils'

function testUser(overrides: Partial<User> = {}): User {
  return {
    id: '1',
    name: 'Test',
    surname: 'User',
    full_name: 'Test User',
    email: 'test@qasa.local',
    locale: 'en',
    email_verified: false,
    ...overrides,
  }
}

beforeEach(() => {
  sessionStorage.clear()
  server.use(getGetStatisticsOverviewMockHandler(), getGetProfileSetupStatusMockHandler())
})

describe('email verification banner', () => {
  it('shows the banner for an unverified user and hides it once dismissed', async () => {
    const user = testUser()
    useAuthStore.getState().setSession('tok-1', user)
    server.use(http.get('*/api/v1/auth/me', () => HttpResponse.json(user)))

    renderApp('/dashboard')
    const userEv = userEvent.setup()

    expect(
      await screen.findByText(
        'Verify your e-mail address so we can be sure important notifications reach you.',
      ),
    ).toBeInTheDocument()

    await userEv.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(
      screen.queryByText(
        'Verify your e-mail address so we can be sure important notifications reach you.',
      ),
    ).not.toBeInTheDocument()
  })

  it('does not show the banner for a verified user', async () => {
    const user = testUser({ email_verified: true })
    useAuthStore.getState().setSession('tok-1', user)
    server.use(http.get('*/api/v1/auth/me', () => HttpResponse.json(user)))

    renderApp('/dashboard')

    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(screen.queryByRole('button', { name: 'Resend' })).not.toBeInTheDocument()
  })

  it('resends the verification e-mail and disables the button while cooling down', async () => {
    const user = testUser()
    useAuthStore.getState().setSession('tok-1', user)
    let resendCalls = 0
    server.use(
      http.get('*/api/v1/auth/me', () => HttpResponse.json(user)),
      http.post('*/api/v1/auth/email/verification-notification', () => {
        resendCalls += 1
        return HttpResponse.json({ message: 'Verification link sent.' })
      }),
    )

    renderApp('/dashboard')
    const userEv = userEvent.setup()

    const resendButton = await screen.findByRole('button', { name: 'Resend' })
    await userEv.click(resendButton)

    await waitFor(() => expect(resendCalls).toBe(1))
    expect(resendButton).toBeDisabled()
  })
})
