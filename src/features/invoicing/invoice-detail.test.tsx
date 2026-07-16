import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import {
  getGetInvoicesIdMockHandler,
  getGetInvoicesInvoicePaymentsMockHandler,
} from '@/api/generated/invoices/invoices.msw'
import { getGetVatRatesMockHandler } from '@/api/generated/vat-rates/vat-rates.msw'
import type { Invoice, User } from '@/api/generated/qASAAPIDocumentation.schemas'
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

function baseInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-1',
    invoice_number: '2026-0001',
    status: 'draft',
    currency: 'EUR',
    total: 100,
    subtotal: 100,
    vat_amount: 0,
    balance: 100,
    payment_status: 'unpaid',
    client: { id: 'c1', display_name: 'Acme s.r.o.' },
    items: [],
    issued_at: '2026-07-01',
    due_at: '2026-07-15',
    ...overrides,
  }
}

beforeEach(() => {
  useAuthStore.getState().setSession('tok-1', testUser)
  server.use(
    getGetVatRatesMockHandler([{ id: 'vat1', rate: 20, is_default: true, code: 'SK-20' }]),
    getGetInvoicesInvoicePaymentsMockHandler([]),
  )
})

describe('invoice detail', () => {
  it('shows a live total preview while adding an item', async () => {
    server.use(getGetInvoicesIdMockHandler(baseInvoice()))

    renderApp('/invoices/inv-1')
    const user = userEvent.setup()

    expect(await screen.findByLabelText('Description')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Description'), 'Consulting')
    await user.clear(screen.getByLabelText('Quantity'))
    await user.type(screen.getByLabelText('Quantity'), '2')
    await user.type(screen.getByLabelText('Unit price'), '50')

    expect(await screen.findByText(/Line total: /)).toHaveTextContent('Line total: €120.00')
  })

  it('only offers status transitions allowed from "sent"', async () => {
    server.use(getGetInvoicesIdMockHandler(baseInvoice({ status: 'sent' })))

    renderApp('/invoices/inv-1')

    expect(await screen.findByRole('button', { name: 'Mark as paid' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send reminder' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as issued' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as sent' })).not.toBeInTheDocument()
  })

  it('records a payment through the dialog', async () => {
    server.use(getGetInvoicesIdMockHandler(baseInvoice({ status: 'sent' })))
    server.use(
      http.post('*/api/v1/invoices/inv-1/payments', async ({ request }) => {
        const body = (await request.json()) as { amount: number }
        return HttpResponse.json(
          { id: 'pay-1', invoice_id: 'inv-1', amount: body.amount, paid_at: '2026-07-10' },
          { status: 201 },
        )
      }),
    )

    renderApp('/invoices/inv-1')
    const user = userEvent.setup()

    await screen.findByText('Payments')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps the e-mail dialog open when the send is throttled', async () => {
    server.use(getGetInvoicesIdMockHandler(baseInvoice({ status: 'sent' })))
    server.use(
      http.post('*/api/v1/invoices/inv-1/email', () =>
        HttpResponse.json({ message: 'Too many requests.' }, { status: 429 }),
      ),
    )

    renderApp('/invoices/inv-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'E-mail' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
  })
})
