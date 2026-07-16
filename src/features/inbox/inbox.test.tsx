import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  getGetInvoiceInboxInboxItemDownloadMockHandler,
  getGetInvoiceInboxMockHandler,
  getPostInvoiceInboxInboxItemConvertMockHandler,
  getPostInvoiceInboxInboxItemIgnoreMockHandler,
} from '@/api/generated/invoice-inbox/invoice-inbox.msw'
import { getGetClientsMockHandler } from '@/api/generated/clients/clients.msw'
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
    getGetInvoiceInboxInboxItemDownloadMockHandler(
      new TextEncoder().encode('%PDF').buffer as ArrayBuffer,
    ),
  )
})

describe('invoice inbox', () => {
  it('renders inbox items with status, ocr engine and matched vendor', async () => {
    server.use(
      getGetInvoiceInboxMockHandler({
        data: [
          {
            id: 'item-1',
            status: 'pending',
            original_filename: 'scan.pdf',
            mime_type: 'application/pdf',
            ocr_engine: 'pdfparser',
            matched_client: { id: 'c1', display_name: 'Vendor s.r.o.' },
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )

    renderApp('/inbox')

    expect(await screen.findByText('scan.pdf')).toBeInTheDocument()
    expect(screen.getByText('pdfparser')).toBeInTheDocument()
    expect(screen.getByText('Vendor s.r.o.')).toBeInTheDocument()
  })

  it('ignores a pending item', async () => {
    server.use(
      getGetInvoiceInboxMockHandler({
        data: [{ id: 'item-1', status: 'pending', original_filename: 'scan.pdf' }],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )
    let ignoreRequested = false
    server.use(
      getPostInvoiceInboxInboxItemIgnoreMockHandler(() => {
        ignoreRequested = true
        return { id: 'item-1', status: 'ignored', original_filename: 'scan.pdf' }
      }),
    )

    renderApp('/inbox')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Ignore' }))

    await waitFor(() => expect(ignoreRequested).toBe(true))
  })

  it('opens the convert sheet prefilled from suggestions and submits', async () => {
    server.use(
      getGetInvoiceInboxMockHandler({
        data: [
          {
            id: 'item-1',
            status: 'pending',
            original_filename: 'scan.pdf',
            mime_type: 'application/pdf',
            matched_client: { id: 'c1', display_name: 'Vendor s.r.o.' },
            suggestions: {
              supplier_invoice_number: 'V-999',
              issued_at: '2026-07-01',
              currency: 'EUR',
            },
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )
    server.use(
      getPostInvoiceInboxInboxItemConvertMockHandler({
        id: 'new-si-id',
        status: 'draft',
      }),
    )

    renderApp('/inbox')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Convert' }))

    const dialog = await screen.findByRole('dialog')
    expect(screen.getByDisplayValue('V-999')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Convert' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
