import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { getGetPublicInvoicesTokenMockHandler } from '@/api/generated/public-invoice/public-invoice.msw'
import { server } from '@/test/server'
import { renderApp } from '@/test/utils'

describe('public invoice page', () => {
  it('renders the invoice snapshot for a valid token', async () => {
    server.use(
      getGetPublicInvoicesTokenMockHandler({
        invoice_number: '2026-0001',
        currency: 'EUR',
        issued_at: '2026-07-01',
        due_at: '2026-07-15',
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
        payment: { balance: 120, is_paid: false, qr_svg: null },
        public_status: 'unpaid',
      }),
    )

    renderApp('/i/tok-123')

    expect(await screen.findByText('2026-0001')).toBeInTheDocument()
    expect(screen.getByText('My Company s.r.o.')).toBeInTheDocument()
    expect(screen.getByText('Acme s.r.o.')).toBeInTheDocument()
    expect(screen.getByText('Consulting')).toBeInTheDocument()
    expect(screen.getByText('Unpaid')).toBeInTheDocument()
  })

  it('shows a not-found state for an unknown token', async () => {
    server.use(
      http.get('*/api/v1/public/invoices/bad-token', () => HttpResponse.json({}, { status: 404 })),
    )

    renderApp('/i/bad-token')

    expect(await screen.findByText('This invoice link is not valid.')).toBeInTheDocument()
  })
})
