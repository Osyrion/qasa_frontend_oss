import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import {
  getGetRecurringInvoiceTemplatesMockHandler,
  getPostRecurringInvoiceTemplatesTemplatePauseMockHandler,
} from '@/api/generated/recurring-invoice-templates/recurring-invoice-templates.msw'
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

describe('recurring templates list', () => {
  it('renders templates with next-run, last-generated and auto-send badge', async () => {
    server.use(
      getGetRecurringInvoiceTemplatesMockHandler({
        data: [
          {
            id: 't-1',
            name: 'Monthly retainer',
            status: 'active',
            period: 'monthly',
            next_run_date: '2026-08-01',
            last_generated_at: null,
            auto_send: true,
            client: { id: 'c1', display_name: 'Acme s.r.o.' },
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )

    renderApp('/recurring')

    expect(await screen.findByText('Monthly retainer')).toBeInTheDocument()
    expect(screen.getByText('Acme s.r.o.')).toBeInTheDocument()
    expect(screen.getByText('Never')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('sends a pause request for an active template', async () => {
    server.use(
      getGetRecurringInvoiceTemplatesMockHandler({
        data: [
          {
            id: 't-1',
            name: 'Monthly retainer',
            status: 'active',
            period: 'monthly',
            next_run_date: '2026-08-01',
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )
    let pauseRequested = false
    server.use(
      getPostRecurringInvoiceTemplatesTemplatePauseMockHandler(() => {
        pauseRequested = true
        return {
          id: 't-1',
          name: 'Monthly retainer',
          status: 'paused',
          period: 'monthly',
          next_run_date: '2026-08-01',
        }
      }),
    )

    renderApp('/recurring')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Pause' }))

    await waitFor(() => expect(pauseRequested).toBe(true))
  })

  it('deletes a template after confirmation', async () => {
    server.use(
      getGetRecurringInvoiceTemplatesMockHandler({
        data: [{ id: 't-1', name: 'Monthly retainer', status: 'active', period: 'monthly' }],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )
    let deleteRequested = false
    server.use(
      http.delete('*/api/v1/recurring-invoice-templates/t-1', () => {
        deleteRequested = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderApp('/recurring')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteRequested).toBe(true))
  })

  it('does not delete a template when the confirmation is cancelled', async () => {
    server.use(
      getGetRecurringInvoiceTemplatesMockHandler({
        data: [{ id: 't-1', name: 'Monthly retainer', status: 'active', period: 'monthly' }],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )
    let deleteRequested = false
    server.use(
      http.delete('*/api/v1/recurring-invoice-templates/t-1', () => {
        deleteRequested = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderApp('/recurring')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(deleteRequested).toBe(false)
  })
})
