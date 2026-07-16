import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { getGetClientsMockHandler } from '@/api/generated/clients/clients.msw'
import { getPostOrdersMockHandler } from '@/api/generated/orders/orders.msw'
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

describe('order form', () => {
  it('creates a personal order without a client', async () => {
    server.use(
      getPostOrdersMockHandler({
        id: 'new-order-id',
        name: 'Personal project',
        status: 'active',
        billing_type: 'hourly',
      }),
    )

    const { router } = renderApp('/orders/new')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Name'), 'Personal project')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/orders/new-order-id'))
  })

  it('maps a 422 response onto the name field', async () => {
    server.use(
      http.post('*/api/v1/orders', () =>
        HttpResponse.json(
          { message: 'Validation failed.', errors: { name: ['The name field is required.'] } },
          { status: 422 },
        ),
      ),
    )

    renderApp('/orders/new')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Name'), 'x')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('The name field is required.')).toBeInTheDocument()
  })
})
