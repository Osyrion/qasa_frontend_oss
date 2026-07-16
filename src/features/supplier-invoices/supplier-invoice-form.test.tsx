import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { getGetClientsMockHandler } from '@/api/generated/clients/clients.msw'
import { getPostSupplierInvoicesMockHandler } from '@/api/generated/supplier-invoices/supplier-invoices.msw'
import { getGetVatRatesMockHandler } from '@/api/generated/vat-rates/vat-rates.msw'
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
      data: [{ id: 'c1', display_name: 'Vendor s.r.o.', client_type: 'company', is_vendor: true }],
      meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
    }),
    getGetVatRatesMockHandler([{ id: 'vat1', rate: 20, is_default: true, code: 'SK-20' }]),
  )
})

describe('supplier invoice form', () => {
  it('creates a draft supplier invoice with one VAT line', async () => {
    server.use(
      getPostSupplierInvoicesMockHandler({
        id: 'new-si-id',
        status: 'draft',
        client: { id: 'c1', display_name: 'Vendor s.r.o.' },
      }),
    )

    const { router } = renderApp('/supplier-invoices/new')
    const user = userEvent.setup()

    await user.click(screen.getByRole('combobox', { name: 'Vendor' }))
    await user.click(await screen.findByRole('option', { name: 'Vendor s.r.o.' }))
    await user.type(screen.getByLabelText("Vendor's invoice number"), 'INV-001')
    await user.type(screen.getByLabelText('Base'), '100')
    await user.type(screen.getByLabelText('VAT amount'), '20')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/supplier-invoices/new-si-id'))
  })

  it('rejects a lone account number without a bank code', async () => {
    renderApp('/supplier-invoices/new')
    const user = userEvent.setup()

    await user.click(screen.getByRole('combobox', { name: 'Vendor' }))
    await user.click(await screen.findByRole('option', { name: 'Vendor s.r.o.' }))
    await user.type(screen.getByLabelText("Vendor's invoice number"), 'INV-001')
    await user.type(screen.getByLabelText('Base'), '100')
    await user.type(screen.getByLabelText('VAT amount'), '20')
    await user.type(screen.getByLabelText('Account number'), '19-123456')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('Account number and bank code must be filled in together.'),
    ).toBeInTheDocument()
  })
})
