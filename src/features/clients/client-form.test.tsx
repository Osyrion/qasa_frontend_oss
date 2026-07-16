import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { getPostClientsMockHandler } from '@/api/generated/clients/clients.msw'
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

describe('client form', () => {
  it('creates an individual client and navigates to its detail page', async () => {
    server.use(
      getPostClientsMockHandler({
        id: 'new-client-id',
        display_name: 'Jane Smith',
        client_type: 'individual',
      }),
    )

    const { router } = renderApp('/clients/new')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('First name'), 'Jane')
    await user.type(screen.getByLabelText('Last name'), 'Smith')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/clients/new-client-id'))
  })

  it('maps a 422 response onto the e-mail field', async () => {
    server.use(
      http.post('*/api/v1/clients', () =>
        HttpResponse.json(
          {
            message: 'Validation failed.',
            errors: { email: ['The email must be a valid email.'] },
          },
          { status: 422 },
        ),
      ),
    )

    renderApp('/clients/new')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('First name'), 'Jane')
    await user.type(screen.getByLabelText('Last name'), 'Smith')
    await user.type(screen.getByLabelText('E-mail'), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('The email must be a valid email.')).toBeInTheDocument()
  })

  it('prefills the form from an IČO lookup and switches to a company client', async () => {
    server.use(
      http.get('*/api/v1/clients/lookup', () =>
        HttpResponse.json({
          company_name: 'Acme s.r.o.',
          ico: '12345678',
          dic: '2012345678',
          vat_id: 'SK2012345678',
          address: 'Hlavná 1',
          city: 'Bratislava',
          postal_code: '81101',
          country: 'SK',
        }),
      ),
    )

    renderApp('/clients/new')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('IČO to look up'), '12345678')
    await user.click(screen.getByRole('button', { name: 'Look up' }))

    expect(await screen.findByDisplayValue('Acme s.r.o.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2012345678')).toBeInTheDocument()
    expect(screen.getByDisplayValue('SK2012345678')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Hlavná 1')).toBeInTheDocument()
    // Switched from the default "individual" type, so the company-name field replaces name/surname.
    expect(screen.queryByLabelText('First name')).not.toBeInTheDocument()
  })
})
