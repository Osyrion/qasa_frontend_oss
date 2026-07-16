import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import {
  getGetReportsEuSalesListMockHandler,
  getGetReportsVatControlStatementMockHandler,
} from '@/api/generated/vat-reports/vat-reports.msw'
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

describe('reports page', () => {
  it('renders EU sales list rows for the selected period', async () => {
    server.use(
      getGetReportsEuSalesListMockHandler({
        data: [
          {
            period: '2026-Q2',
            vat_id: 'DE123456789',
            client_name: 'Acme GmbH',
            amount: 500,
            code: 3,
          },
        ],
      }),
    )

    renderApp('/reports')

    expect(await screen.findByText('DE123456789')).toBeInTheDocument()
    expect(screen.getByText('Acme GmbH')).toBeInTheDocument()
  })

  it('shows a friendly non-payer state for the control statement on a 422', async () => {
    server.use(
      http.get('*/api/v1/reports/vat-control-statement', () =>
        HttpResponse.json({ message: 'Not a VAT payer.' }, { status: 422 }),
      ),
    )

    renderApp('/reports')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('tab', { name: 'VAT control statement' }))

    expect(await screen.findByText('Not a VAT payer')).toBeInTheDocument()
  })

  it('renders control statement sections grouped by section code', async () => {
    server.use(
      getGetReportsVatControlStatementMockHandler({
        country: 'SK',
        year: 2026,
        quarter: 3,
        month: null,
        sections: {
          A1: [
            {
              document_number: '2026-0001',
              date: '2026-07-01',
              partner_name: 'Acme s.r.o.',
              partner_tax_id: 'SK1234567890',
              rate: 20,
              base: 100,
              vat: 20,
              related_document_number: null,
            },
          ],
        },
        summary_sections: {},
        assumptions: [],
      }),
    )

    renderApp('/reports')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('tab', { name: 'VAT control statement' }))

    expect(await screen.findByText('Section A1')).toBeInTheDocument()
    expect(screen.getByText('Acme s.r.o.')).toBeInTheDocument()
  })

  it('does not request a download when no date range is set (dialog stays open, no request fires)', async () => {
    let requested = false
    server.use(
      http.get('*/api/v1/invoices/export/pohoda', () => {
        requested = true
        return new HttpResponse(null, { status: 200 })
      }),
    )

    renderApp('/reports')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('tab', { name: 'Exports' }))
    await user.click(screen.getByRole('button', { name: 'Invoices' }))

    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Pohoda XML' }))

    // No dates entered — the dialog stays open and the download never fires.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(requested).toBe(false)
  })

  it('downloads a Pohoda export once a date range is entered', async () => {
    let requested = false
    server.use(
      http.get('*/api/v1/invoices/export/pohoda', () => {
        requested = true
        return HttpResponse.arrayBuffer(new TextEncoder().encode('<xml/>').buffer as ArrayBuffer, {
          headers: { 'Content-Type': 'application/xml' },
        })
      }),
    )

    renderApp('/reports')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('tab', { name: 'Exports' }))
    await user.click(screen.getByRole('button', { name: 'Invoices' }))

    const dialog = await screen.findByRole('dialog')
    const dateInputs = dialog.querySelectorAll('input[type="date"]')
    await user.type(dateInputs[0], '2026-01-01')
    await user.type(dateInputs[1], '2026-01-31')

    await user.click(screen.getByRole('button', { name: 'Pohoda XML' }))

    await waitFor(() => expect(requested).toBe(true))
  })
})
