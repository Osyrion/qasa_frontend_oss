import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { getGetClientsMockHandler } from '@/api/generated/clients/clients.msw'
import { getPostQuotesMockHandler } from '@/api/generated/quotes/quotes.msw'
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
    getGetClientsMockHandler({
      data: [{ id: 'c1', display_name: 'Acme s.r.o.', client_type: 'company' }],
      meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
    }),
  )
})

describe('quote form', () => {
  it('creates a draft quote and navigates to its detail page', async () => {
    server.use(
      getPostQuotesMockHandler({
        id: 'new-quote-id',
        status: 'draft',
        client: { id: 'c1', display_name: 'Acme s.r.o.' },
      }),
    )

    const { router } = renderApp('/quotes/new')
    const user = userEvent.setup()

    await user.click(screen.getByRole('combobox', { name: 'Client' }))
    await user.click(await screen.findByRole('option', { name: 'Acme s.r.o.' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/quotes/new-quote-id'))
  })

  it('maps a 422 response onto the valid_until field', async () => {
    server.use(
      http.post('*/api/v1/quotes', () =>
        HttpResponse.json(
          {
            message: 'Validation failed.',
            errors: { valid_until: ['The valid until date must be after the issue date.'] },
          },
          { status: 422 },
        ),
      ),
    )

    renderApp('/quotes/new')
    const user = userEvent.setup()

    await user.click(screen.getByRole('combobox', { name: 'Client' }))
    await user.click(await screen.findByRole('option', { name: 'Acme s.r.o.' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('The valid until date must be after the issue date.'),
    ).toBeInTheDocument()
  })
})
