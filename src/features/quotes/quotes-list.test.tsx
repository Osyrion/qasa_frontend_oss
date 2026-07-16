import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { getGetQuotesMockHandler } from '@/api/generated/quotes/quotes.msw'
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

describe('quotes list', () => {
  it('renders quotes returned by the list endpoint', async () => {
    server.use(
      getGetQuotesMockHandler({
        data: [
          {
            id: 'q-1',
            quote_number: '2026-Q0001',
            status: 'sent',
            effective_status: 'sent',
            currency: 'EUR',
            total: 123.45,
            valid_until: '2026-08-01',
            client: { id: 'c1', display_name: 'Acme s.r.o.' },
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )

    renderApp('/quotes')

    expect(await screen.findByText('2026-Q0001')).toBeInTheDocument()
    expect(screen.getByText('Acme s.r.o.')).toBeInTheDocument()
  })

  it('applies the status filter from the URL to the request', async () => {
    server.use(
      getGetQuotesMockHandler((info) => {
        const url = new URL(info.request.url)
        const status = url.searchParams.get('status')
        return {
          data: [
            {
              id: 'q-1',
              quote_number: status ? `filtered-${status}` : 'unfiltered',
              status: 'draft',
              effective_status: 'draft',
              currency: 'EUR',
              total: 10,
            },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
        }
      }),
    )

    renderApp('/quotes?status=accepted')

    expect(await screen.findByText('filtered-accepted')).toBeInTheDocument()
  })

  it('reflects the page from the URL and advances it on Next', async () => {
    server.use(
      getGetQuotesMockHandler((info) => {
        const url = new URL(info.request.url)
        const page = Number(url.searchParams.get('page') ?? '1')
        return {
          data: [
            {
              id: `q-${page}`,
              quote_number: `page-${page}`,
              status: 'draft',
              effective_status: 'draft',
              currency: 'EUR',
              total: 10,
            },
          ],
          meta: { current_page: page, last_page: 3, per_page: 20, total: 50 },
        }
      }),
    )

    const { router } = renderApp('/quotes?page=2')

    expect(await screen.findByText('page-2')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Next/ }))

    expect(await screen.findByText('page-3')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toContain('page=3'))
  })
})
