import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  getGetSupplierInvoicesIdMockHandler,
  getPostSupplierInvoicesSupplierInvoiceStatusMockHandler,
  getPostSupplierInvoicesSupplierInvoiceVerifyAccountMockHandler,
} from '@/api/generated/supplier-invoices/supplier-invoices.msw'
import type { SupplierInvoice, User } from '@/api/generated/qASAAPIDocumentation.schemas'
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

function baseInvoice(overrides: Partial<SupplierInvoice> = {}): SupplierInvoice {
  return {
    id: 'si-1',
    internal_number: 'DF-2026-001',
    supplier_invoice_number: 'V-100',
    status: 'received',
    vat_regime: 'domestic',
    currency: 'EUR',
    total: 120,
    subtotal: 100,
    vat_amount: 20,
    self_assessed_vat_amount: 0,
    client: { id: 'c1', display_name: 'Vendor s.r.o.' },
    vat_lines: [{ id: 'l1', vat_rate: 20, base: 100, vat_amount: 20, sort_order: 0 }],
    ...overrides,
  }
}

beforeEach(() => {
  useAuthStore.getState().setSession('tok-1', testUser)
})

describe('supplier invoice detail', () => {
  it('opens a paid_at dialog before marking as paid', async () => {
    server.use(getGetSupplierInvoicesIdMockHandler(baseInvoice()))
    server.use(
      getPostSupplierInvoicesSupplierInvoiceStatusMockHandler(baseInvoice({ status: 'paid' })),
    )

    renderApp('/supplier-invoices/si-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Change status' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Mark as paid' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Paid on')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows the self-assessed VAT row for a reverse-charge invoice', async () => {
    server.use(
      getGetSupplierInvoicesIdMockHandler(
        baseInvoice({ vat_regime: 'eu_reverse_charge', self_assessed_vat_amount: 20 }),
      ),
    )

    renderApp('/supplier-invoices/si-1')

    expect(await screen.findByText('Self-assessed VAT')).toBeInTheDocument()
  })

  it('shows the verification result after verifying the account', async () => {
    server.use(
      getGetSupplierInvoicesIdMockHandler(baseInvoice({ vendor_iban: 'CZ6508000000192000145399' })),
    )
    server.use(
      getPostSupplierInvoicesSupplierInvoiceVerifyAccountMockHandler({
        result: 'unpublished',
        verified_at: '2026-07-16T10:00:00Z',
        published_accounts: [{ account_number: '123456', bank_code: '0800', iban: null }],
      }),
    )

    renderApp('/supplier-invoices/si-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Verify account' }))

    // The mismatch list comes straight off the mutation response — it isn't
    // persisted, so this is the reliable signal (the badge itself would need
    // a refetch of the detail query, which the static mock here doesn't reflect).
    expect(await screen.findByText('123456')).toBeInTheDocument()
  })
})
