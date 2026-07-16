import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import {
  getGetInvoicesIdMockHandler,
  getGetInvoicesInvoicePaymentsMockHandler,
  getGetInvoicesInvoiceWorkReportMockHandler,
} from '@/api/generated/invoices/invoices.msw'
import { getGetVatRatesMockHandler } from '@/api/generated/vat-rates/vat-rates.msw'
import type { Invoice, User, WorkReportLine } from '@/api/generated/qASAAPIDocumentation.schemas'
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
    getGetInvoicesIdMockHandler(baseInvoice()),
  )
})

describe('work report', () => {
  it('renders lines and their total', async () => {
    const lines: WorkReportLine[] = [
      { id: 'l1', work_date: '2026-07-01', description: 'Design', hours: 3 },
      { id: 'l2', work_date: '2026-07-02', description: 'Build', hours: 5 },
    ]
    server.use(getGetInvoicesInvoiceWorkReportMockHandler(lines))

    renderApp('/invoices/inv-1')

    expect(await screen.findByText('Work report')).toBeInTheDocument()
    expect(await screen.findByText('Design')).toBeInTheDocument()
    expect(screen.getByText('Build')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('shows an empty state when there are no lines', async () => {
    server.use(getGetInvoicesInvoiceWorkReportMockHandler([]))

    renderApp('/invoices/inv-1')

    expect(await screen.findByText('No work report lines yet.')).toBeInTheDocument()
  })

  it('replaces all lines on save', async () => {
    server.use(
      getGetInvoicesInvoiceWorkReportMockHandler([
        { id: 'l1', work_date: '2026-07-01', description: 'Design', hours: 3 },
      ]),
    )
    let sentBody: unknown = null
    server.use(
      http.put('*/api/v1/invoices/inv-1/work-report', async ({ request }) => {
        sentBody = await request.json()
        return HttpResponse.json([])
      }),
    )

    renderApp('/invoices/inv-1')
    const user = userEvent.setup()

    await screen.findByText('Design')
    const card = within(screen.getByTestId('work-report-card'))
    await user.click(card.getByRole('button', { name: 'Edit' }))

    await user.click(card.getByRole('button', { name: 'Add line' }))

    const descriptions = card.getAllByLabelText('Description')
    await user.type(descriptions[1], 'Review')
    const hours = card.getAllByLabelText('Hours')
    await user.type(hours[1], '2')
    const dates = card.getAllByLabelText('Date')
    fireEvent.change(dates[1], { target: { value: '2026-07-03' } })

    await user.click(card.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(sentBody).toEqual({
        lines: [
          { work_date: '2026-07-01', description: 'Design', hours: 3 },
          { work_date: '2026-07-03', description: 'Review', hours: 2 },
        ],
      }),
    )
  })

  it('does not offer edit on a non-editable invoice', async () => {
    server.use(getGetInvoicesIdMockHandler(baseInvoice({ status: 'sent' })))
    server.use(getGetInvoicesInvoiceWorkReportMockHandler([]))

    renderApp('/invoices/inv-1')

    await screen.findByText('No work report lines yet.')
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })
})
