import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { getGetClientsMockHandler } from '@/api/generated/clients/clients.msw'
import { getPostInvoicesMockHandler } from '@/api/generated/invoices/invoices.msw'
import { getGetBankAccountsMockHandler } from '@/api/generated/bank-accounts/bank-accounts.msw'
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
    getGetBankAccountsMockHandler([]),
  )
})

describe('invoice form', () => {
  it('creates a draft invoice (no items yet) and navigates to its detail page', async () => {
    server.use(
      getPostInvoicesMockHandler({
        id: 'new-invoice-id',
        status: 'draft',
        client: { id: 'c1', display_name: 'Acme s.r.o.' },
      }),
    )

    const { router } = renderApp('/invoices/new')
    const user = userEvent.setup()

    await user.click(screen.getByRole('combobox', { name: 'Client' }))
    await user.click(await screen.findByRole('option', { name: 'Acme s.r.o.' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/invoices/new-invoice-id'))
  })

  it('maps a 422 response onto the due_at field', async () => {
    server.use(
      http.post('*/api/v1/invoices', () =>
        HttpResponse.json(
          {
            message: 'Validation failed.',
            errors: { due_at: ['The due date must be after the issue date.'] },
          },
          { status: 422 },
        ),
      ),
    )

    renderApp('/invoices/new')
    const user = userEvent.setup()

    await user.click(screen.getByRole('combobox', { name: 'Client' }))
    await user.click(await screen.findByRole('option', { name: 'Acme s.r.o.' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('The due date must be after the issue date.'),
    ).toBeInTheDocument()
  })
})
