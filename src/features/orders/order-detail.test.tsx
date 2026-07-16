import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { getGetOrdersIdMockHandler } from '@/api/generated/orders/orders.msw'
import { getGetOrdersOrderAttachmentsMockHandler } from '@/api/generated/order-attachments/order-attachments.msw'
import { getPostOrdersOrderItemsMockHandler } from '@/api/generated/order-items/order-items.msw'
import { getGetVatRatesMockHandler } from '@/api/generated/vat-rates/vat-rates.msw'
import type { Order, User } from '@/api/generated/qASAAPIDocumentation.schemas'
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

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o-1',
    name: 'Website redesign',
    status: 'active',
    billing_type: 'hourly',
    effective_currency: 'EUR',
    client: null,
    items: [],
    notes: [{ id: 'n-1', content: 'Existing note', created_at: '2026-07-01T10:00:00Z' }],
    ...overrides,
  }
}

beforeEach(() => {
  useAuthStore.getState().setSession('tok-1', testUser)
  server.use(
    getGetVatRatesMockHandler([{ id: 'vat1', rate: 20, is_default: true, code: 'SK-20' }]),
    getGetOrdersOrderAttachmentsMockHandler([]),
  )
})

describe('order detail', () => {
  it('disables generate-invoice for a personal order (no client)', async () => {
    server.use(getGetOrdersIdMockHandler(baseOrder()))

    renderApp('/orders/o-1')

    expect(await screen.findByRole('button', { name: 'Generate invoice' })).toBeDisabled()
  })

  it('enables generate-invoice once a client is assigned', async () => {
    server.use(
      getGetOrdersIdMockHandler(baseOrder({ client: { id: 'c1', display_name: 'Acme s.r.o.' } })),
    )

    renderApp('/orders/o-1')

    expect(await screen.findByRole('button', { name: 'Generate invoice' })).toBeEnabled()
  })

  it('adds an item with a type selection', async () => {
    server.use(getGetOrdersIdMockHandler(baseOrder()))
    server.use(
      getPostOrdersOrderItemsMockHandler({
        id: 'item-1',
        type: 'service',
        description: 'Consulting',
        quantity: 1,
        unit_price: 100,
        total_incl_vat: 120,
      }),
    )

    renderApp('/orders/o-1')
    const user = userEvent.setup()

    await screen.findByLabelText('Description')
    await user.type(screen.getByLabelText('Description'), 'Consulting')
    await user.type(screen.getByLabelText('Unit price'), '100')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => expect(screen.getByLabelText('Description')).toHaveValue(''))
  })

  it('sends a delete request when removing a note (server enforces own-note-only via 403)', async () => {
    server.use(getGetOrdersIdMockHandler(baseOrder()))
    let deleteRequested = false
    server.use(
      http.delete('*/api/v1/orders/o-1/notes/n-1', () => {
        deleteRequested = true
        return HttpResponse.json({}, { status: 403 })
      }),
    )

    renderApp('/orders/o-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('tab', { name: 'Notes' }))
    const noteRow = await screen.findByText('Existing note')
    const listItem = noteRow.closest('li')
    expect(listItem).not.toBeNull()

    await user.click(within(listItem as HTMLElement).getByRole('button'))

    await waitFor(() => expect(deleteRequested).toBe(true))
    // The note stays visible — a 403 must not optimistically remove it from the list.
    expect(screen.getByText('Existing note')).toBeInTheDocument()
  })

  it('lists attachments in the attachments tab', async () => {
    server.use(getGetOrdersIdMockHandler(baseOrder()))
    server.use(
      getGetOrdersOrderAttachmentsMockHandler([
        {
          id: 'a-1',
          filename: 'contract.pdf',
          display_name: 'contract.pdf',
          size_human: '120 KB',
          url: 'https://cdn.example.com/contract.pdf',
          is_pdf: true,
        },
      ]),
    )

    renderApp('/orders/o-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('tab', { name: 'Attachments' }))

    expect(await screen.findByText('contract.pdf')).toBeInTheDocument()
  })
})
