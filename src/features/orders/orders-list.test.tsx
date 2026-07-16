import { screen } from '@testing-library/react'

import { getGetOrdersMockHandler } from '@/api/generated/orders/orders.msw'
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

describe('orders list', () => {
  it('renders orders returned by the list endpoint, including personal orders', async () => {
    server.use(
      getGetOrdersMockHandler({
        data: [
          {
            id: 'o-1',
            name: 'Website redesign',
            status: 'active',
            billing_type: 'hourly',
            color: '#3B82F6',
            client: { id: 'c1', display_name: 'Acme s.r.o.' },
          },
          {
            id: 'o-2',
            name: 'Personal project',
            status: 'active',
            billing_type: 'fixed_per_item',
            client: null,
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
      }),
    )

    renderApp('/orders')

    expect(await screen.findByText('Website redesign')).toBeInTheDocument()
    expect(screen.getByText('Acme s.r.o.')).toBeInTheDocument()
    expect(screen.getByText('Personal project')).toBeInTheDocument()
    expect(screen.getByText('Personal order')).toBeInTheDocument()
  })
})
