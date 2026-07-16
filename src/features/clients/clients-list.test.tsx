import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { getGetClientsMockHandler } from '@/api/generated/clients/clients.msw'
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

describe('clients list', () => {
  it('renders clients returned by the list endpoint', async () => {
    server.use(
      getGetClientsMockHandler({
        data: [
          {
            id: 'c1',
            display_name: 'Acme s.r.o.',
            client_type: 'company',
            is_customer: true,
            is_vendor: false,
            email: 'acme@example.com',
            created_at: '2026-01-05T10:00:00Z',
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )

    renderApp('/clients')

    expect(await screen.findByText('Acme s.r.o.')).toBeInTheDocument()
    expect(screen.getByText('acme@example.com')).toBeInTheDocument()
  })

  it('reflects the page from the URL and advances it on Next (state survives refresh)', async () => {
    server.use(
      getGetClientsMockHandler((info) => {
        const url = new URL(info.request.url)
        const page = Number(url.searchParams.get('page') ?? '1')
        return {
          data: [
            {
              id: `c${page}`,
              display_name: `Client page ${page}`,
              client_type: 'company',
              is_customer: true,
              is_vendor: false,
            },
          ],
          meta: { current_page: page, last_page: 3, per_page: 20, total: 50 },
        }
      }),
    )

    const { router } = renderApp('/clients?page=2')

    expect(await screen.findByText('Client page 2')).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 3 (50 total)')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Next/ }))

    expect(await screen.findByText('Client page 3')).toBeInTheDocument()
    expect(router.state.location.search).toContain('page=3')
  })

  it('debounces the search input and resets to page 1', async () => {
    server.use(
      getGetClientsMockHandler({
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      }),
    )

    const { router } = renderApp('/clients?page=2')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Search by name, IČO or e-mail…'), 'acme')

    await waitFor(() => expect(router.state.location.search).toContain('search=acme'), {
      timeout: 1000,
    })
    expect(router.state.location.search).not.toContain('page=2')
  })

  it('toggles sort direction on the Created column and encodes it in the URL', async () => {
    server.use(
      getGetClientsMockHandler((info) => {
        const url = new URL(info.request.url)
        const sort = url.searchParams.get('sort')
        const direction = url.searchParams.get('direction')
        return {
          data: [
            {
              id: 'c1',
              display_name: sort ? `sorted-${sort}-${direction}` : 'unsorted',
              client_type: 'company',
              is_customer: true,
              is_vendor: false,
            },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
        }
      }),
    )

    const { router } = renderApp('/clients')
    expect(await screen.findByText('unsorted')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Created' }))

    await waitFor(() => expect(router.state.location.search).toContain('sort=created_at'))
    const direction = /direction=(asc|desc)/.exec(router.state.location.search)?.[1]
    expect(direction).toBeDefined()
    expect(await screen.findByText(`sorted-created_at-${direction}`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Created' }))
    const flipped = direction === 'asc' ? 'desc' : 'asc'
    await waitFor(() => expect(router.state.location.search).toContain(`direction=${flipped}`))
  })
})
