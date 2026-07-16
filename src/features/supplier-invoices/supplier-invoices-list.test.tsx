import { screen } from '@testing-library/react'

import { getGetSupplierInvoicesMockHandler } from '@/api/generated/supplier-invoices/supplier-invoices.msw'
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

describe('supplier invoices list', () => {
  it('renders supplier invoices returned by the list endpoint', async () => {
    server.use(
      getGetSupplierInvoicesMockHandler({
        data: [
          {
            id: 'si-1',
            internal_number: 'DF-2026-001',
            status: 'received',
            currency: 'EUR',
            total: 250,
            due_at: '2026-08-01',
            client: { id: 'c1', display_name: 'Vendor s.r.o.' },
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )

    renderApp('/supplier-invoices')

    expect(await screen.findByText('DF-2026-001')).toBeInTheDocument()
    expect(screen.getByText('Vendor s.r.o.')).toBeInTheDocument()
  })
})
