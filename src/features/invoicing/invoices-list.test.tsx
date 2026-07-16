import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { getGetInvoicesMockHandler } from '@/api/generated/invoices/invoices.msw'
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
})

describe('invoices list', () => {
  it('renders invoices returned by the list endpoint', async () => {
    server.use(
      getGetInvoicesMockHandler({
        data: [
          {
            id: 'inv-1',
            invoice_number: '2026-0001',
            status: 'sent',
            currency: 'EUR',
            total: 123.45,
            due_at: '2026-08-01',
            is_overdue: false,
            client: { id: 'c1', display_name: 'Acme s.r.o.' },
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )

    renderApp('/invoices')

    expect(await screen.findByText('2026-0001')).toBeInTheDocument()
    expect(screen.getByText('Acme s.r.o.')).toBeInTheDocument()
  })

  it('applies the status filter from the URL to the request', async () => {
    server.use(
      getGetInvoicesMockHandler((info) => {
        const url = new URL(info.request.url)
        const status = url.searchParams.get('status')
        return {
          data: [
            {
              id: 'inv-1',
              invoice_number: status ? `filtered-${status}` : 'unfiltered',
              status: 'draft',
              currency: 'EUR',
              total: 10,
            },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
        }
      }),
    )

    renderApp('/invoices?status=paid')

    expect(await screen.findByText('filtered-paid')).toBeInTheDocument()
  })

  it('reflects the page from the URL and advances it on Next', async () => {
    server.use(
      getGetInvoicesMockHandler((info) => {
        const url = new URL(info.request.url)
        const page = Number(url.searchParams.get('page') ?? '1')
        return {
          data: [
            {
              id: `inv-${page}`,
              invoice_number: `page-${page}`,
              status: 'draft',
              currency: 'EUR',
              total: 10,
            },
          ],
          meta: { current_page: page, last_page: 3, per_page: 20, total: 50 },
        }
      }),
    )

    const { router } = renderApp('/invoices?page=2')

    expect(await screen.findByText('page-2')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Next/ }))

    expect(await screen.findByText('page-3')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toContain('page=3'))
  })
})
