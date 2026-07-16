import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { getGetQuotesIdMockHandler } from '@/api/generated/quotes/quotes.msw'
import { getGetVatRatesMockHandler } from '@/api/generated/vat-rates/vat-rates.msw'
import type { Quote, User } from '@/api/generated/qASAAPIDocumentation.schemas'
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

function baseQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'q-1',
    quote_number: '2026-Q0001',
    status: 'draft',
    effective_status: 'draft',
    currency: 'EUR',
    total: 100,
    subtotal: 100,
    vat_amount: 0,
    client: { id: 'c1', display_name: 'Acme s.r.o.' },
    items: [],
    issued_at: '2026-07-01',
    valid_until: '2026-07-15',
    ...overrides,
  }
}

beforeEach(() => {
  useAuthStore.getState().setSession('tok-1', testUser)
  server.use(getGetVatRatesMockHandler([{ id: 'vat1', rate: 20, is_default: true, code: 'SK-20' }]))
})

describe('quote detail', () => {
  it('shows a live total preview while adding an item', async () => {
    server.use(getGetQuotesIdMockHandler(baseQuote()))

    renderApp('/quotes/q-1')
    const user = userEvent.setup()

    expect(await screen.findByLabelText('Description')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Description'), 'Consulting')
    await user.clear(screen.getByLabelText('Quantity'))
    await user.type(screen.getByLabelText('Quantity'), '2')
    await user.type(screen.getByLabelText('Unit price'), '50')

    expect(await screen.findByText(/Line total: /)).toHaveTextContent('Line total: €120.00')
  })

  it('only offers status transitions allowed from "sent"', async () => {
    server.use(getGetQuotesIdMockHandler(baseQuote({ status: 'sent', effective_status: 'sent' })))

    renderApp('/quotes/q-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Change status' }))

    expect(await screen.findByRole('menuitem', { name: 'Mark as accepted' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Mark as rejected' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Mark as expired' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Mark as sent' })).not.toBeInTheDocument()
  })

  it('hides the change-status menu once a quote is terminal', async () => {
    server.use(
      getGetQuotesIdMockHandler(baseQuote({ status: 'accepted', effective_status: 'accepted' })),
    )

    renderApp('/quotes/q-1')

    await screen.findByText('2026-Q0001')
    expect(screen.queryByRole('button', { name: 'Change status' })).not.toBeInTheDocument()
  })

  it('offers convert-to-invoice and convert-to-order for a sent quote', async () => {
    server.use(getGetQuotesIdMockHandler(baseQuote({ status: 'sent', effective_status: 'sent' })))

    renderApp('/quotes/q-1')

    expect(await screen.findByRole('button', { name: 'Convert to invoice' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Convert to order' })).toBeInTheDocument()
  })

  it('keeps the e-mail dialog open when the send is throttled', async () => {
    server.use(getGetQuotesIdMockHandler(baseQuote({ status: 'sent', effective_status: 'sent' })))
    server.use(
      http.post('*/api/v1/quotes/q-1/email', () =>
        HttpResponse.json({ message: 'Too many requests.' }, { status: 429 }),
      ),
    )

    renderApp('/quotes/q-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'E-mail' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
  })
})
