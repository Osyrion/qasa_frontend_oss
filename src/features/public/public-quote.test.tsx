import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import {
  getGetPublicQuotesTokenMockHandler,
  getPostPublicQuotesTokenAcceptMockHandler,
} from '@/api/generated/public-quote/public-quote.msw'
import { server } from '@/test/server'
import { renderApp } from '@/test/utils'

describe('public quote page', () => {
  it('renders the quote snapshot for a valid token', async () => {
    server.use(
      getGetPublicQuotesTokenMockHandler({
        quote_number: '2026-Q0001',
        currency: 'EUR',
        issued_at: '2026-07-01',
        valid_until: '2026-07-15',
        supplier: { name: 'My Company s.r.o.' },
        client: { name: 'Acme s.r.o.' },
        items: [
          {
            description: 'Consulting',
            quantity: 2,
            unit: 'h',
            unit_price: 50,
            vat_rate: 20,
            total_incl_vat: 120,
          },
        ],
        vat_recap: [{ rate: 20, base: 100, vat: 20, total: 120 }],
        subtotal: 100,
        vat_amount: 20,
        total: 120,
        effective_status: 'sent',
        can_decide: true,
      }),
    )

    renderApp('/q/tok-123')

    expect(await screen.findByText('2026-Q0001')).toBeInTheDocument()
    expect(screen.getByText('My Company s.r.o.')).toBeInTheDocument()
    expect(screen.getByText('Acme s.r.o.')).toBeInTheDocument()
    expect(screen.getByText('Consulting')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept quote' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject quote' })).toBeInTheDocument()
  })

  it('shows a not-found state for an unknown token', async () => {
    server.use(
      http.get('*/api/v1/public/quotes/bad-token', () => HttpResponse.json({}, { status: 404 })),
    )

    renderApp('/q/bad-token')

    expect(await screen.findByText('This quote link is not valid.')).toBeInTheDocument()
  })

  it('hides the decision panel once can_decide is false', async () => {
    server.use(
      getGetPublicQuotesTokenMockHandler({
        quote_number: '2026-Q0001',
        currency: 'EUR',
        issued_at: '2026-07-01',
        items: [],
        vat_recap: [],
        subtotal: 0,
        vat_amount: 0,
        total: 0,
        effective_status: 'accepted',
        can_decide: false,
      }),
    )

    renderApp('/q/tok-123')

    await screen.findByText('2026-Q0001')
    expect(screen.queryByRole('button', { name: 'Accept quote' })).not.toBeInTheDocument()
  })

  it('accepts the quote after confirming', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    server.use(
      getGetPublicQuotesTokenMockHandler({
        quote_number: '2026-Q0001',
        currency: 'EUR',
        issued_at: '2026-07-01',
        items: [],
        vat_recap: [],
        subtotal: 0,
        vat_amount: 0,
        total: 0,
        effective_status: 'sent',
        can_decide: true,
      }),
      getPostPublicQuotesTokenAcceptMockHandler({
        status: 'accepted',
        accepted_at: '2026-07-02T10:00:00Z',
      }),
    )

    renderApp('/q/tok-123')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Accept quote' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Accept quote' })).not.toBeInTheDocument(),
    )
    confirmSpy.mockRestore()
  })
})
