import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { getGetClientsMockHandler } from '@/api/generated/clients/clients.msw'
import { getPostRecurringInvoiceTemplatesMockHandler } from '@/api/generated/recurring-invoice-templates/recurring-invoice-templates.msw'
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
      data: [{ id: 'c1', display_name: 'Acme s.r.o.', client_type: 'company' }],
      meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
    }),
    getGetVatRatesMockHandler([{ id: 'vat1', rate: 20, is_default: true, code: 'SK-20' }]),
  )
})

describe('recurring template form', () => {
  it('creates a monthly template with one item and navigates to edit', async () => {
    server.use(
      getPostRecurringInvoiceTemplatesMockHandler({
        id: 'new-template-id',
        name: 'Monthly retainer',
        status: 'active',
        period: 'monthly',
      }),
    )

    const { router } = renderApp('/recurring/new')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Name'), 'Monthly retainer')
    await user.click(screen.getByRole('combobox', { name: 'Client' }))
    await user.click(await screen.findByRole('option', { name: 'Acme s.r.o.' }))

    await user.type(screen.getByLabelText('Description'), 'Retainer fee')
    await user.type(screen.getByLabelText('Unit price'), '500')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/recurring/new-template-id/edit'),
    )
  })

  it('shows a live placeholder preview in the note field', async () => {
    renderApp('/recurring/new')
    const user = userEvent.setup()

    // userEvent.type() treats a single `{`/`}` as a special-key escape sequence —
    // double them to type the literal placeholder token `{MONTH}`.
    await user.type(screen.getByLabelText('Note (above items)'), 'Services for {{MONTH}}')

    expect(await screen.findByText(/Preview:/)).toBeInTheDocument()
  })

  it('disables day-of-month when "last day of month" is checked', async () => {
    renderApp('/recurring/new')
    const user = userEvent.setup()

    expect(screen.getByLabelText('Day of month')).toBeEnabled()
    await user.click(screen.getByRole('checkbox', { name: 'Last day of month' }))

    expect(screen.getByLabelText('Day of month')).toBeDisabled()
  })
})
