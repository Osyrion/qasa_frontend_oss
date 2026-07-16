import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

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
  email_verified: false,
}

const signedUrl = 'http://localhost:8000/api/v1/auth/email/verify/u1/hash?expires=1&signature=abc'

describe('verify email', () => {
  it('verifies the signed link and offers to continue to login when signed out', async () => {
    server.use(
      http.get('*/api/v1/auth/email/verify/u1/hash', () =>
        HttpResponse.json({ message: 'Email verified' }),
      ),
    )

    renderApp(`/verify-email?url=${encodeURIComponent(signedUrl)}`)

    expect(await screen.findByText('E-mail verified')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/login')
  })

  it('offers to continue to the dashboard when already signed in', async () => {
    useAuthStore.getState().setSession('tok-1', testUser)
    server.use(
      http.get('*/api/v1/auth/me', () => HttpResponse.json(testUser)),
      http.get('*/api/v1/auth/email/verify/u1/hash', () =>
        HttpResponse.json({ message: 'Email verified' }),
      ),
    )

    renderApp(`/verify-email?url=${encodeURIComponent(signedUrl)}`)

    expect(await screen.findByText('E-mail verified')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/dashboard')
  })

  it('shows an error state for an invalid or expired link', async () => {
    server.use(
      http.get('*/api/v1/auth/email/verify/u1/hash', () =>
        HttpResponse.json({ message: 'Invalid link.' }, { status: 403 }),
      ),
    )

    renderApp(`/verify-email?url=${encodeURIComponent(signedUrl)}`)

    expect(await screen.findByText('Verification failed')).toBeInTheDocument()
  })

  it('refuses to follow a url that does not point back at our own API', async () => {
    renderApp(`/verify-email?url=${encodeURIComponent('https://evil.example.com/steal-token')}`)

    expect(await screen.findByText('Verification failed')).toBeInTheDocument()
  })

  it('shows an error state when the url param is missing', async () => {
    renderApp('/verify-email')

    expect(await screen.findByText('Verification failed')).toBeInTheDocument()
  })
})
