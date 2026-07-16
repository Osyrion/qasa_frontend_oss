import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  getGetClientsIdMockHandler,
  getDeleteClientsIdMockHandler,
} from '@/api/generated/clients/clients.msw'
import {
  getGetClientsClientIdContactPersonsMockHandler,
  getPostClientsClientIdContactPersonsMockHandler,
  getDeleteClientsClientIdContactPersonsIdMockHandler,
} from '@/api/generated/contact-persons/contact-persons.msw'
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

describe('client detail', () => {
  it('renders client details and its contact persons', async () => {
    server.use(
      getGetClientsIdMockHandler({
        id: 'c1',
        display_name: 'Acme s.r.o.',
        client_type: 'company',
        email: 'acme@example.com',
        is_customer: true,
        is_vendor: false,
      }),
      getGetClientsClientIdContactPersonsMockHandler([
        {
          id: 'p1',
          full_name: 'John Doe',
          role: 'Accountant',
          email: 'john@example.com',
          is_primary: true,
        },
      ]),
    )

    renderApp('/clients/c1')

    expect(await screen.findByRole('heading', { name: 'Acme s.r.o.' })).toBeInTheDocument()
    expect(screen.getByText('acme@example.com')).toBeInTheDocument()
    expect(await screen.findByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Primary contact')).toBeInTheDocument()
  })

  it('adds a contact person through the dialog', async () => {
    server.use(
      getGetClientsIdMockHandler({ id: 'c1', display_name: 'Acme s.r.o.', client_type: 'company' }),
      getGetClientsClientIdContactPersonsMockHandler([]),
      getPostClientsClientIdContactPersonsMockHandler({
        id: 'p1',
        full_name: 'Jane Roe',
      }),
    )

    renderApp('/clients/c1')
    const user = userEvent.setup()

    expect(await screen.findByText('No contact persons yet.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(screen.getByLabelText('First name'), 'Jane')
    await user.type(screen.getByLabelText('Last name'), 'Roe')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('deletes the client after confirming', async () => {
    server.use(
      getGetClientsIdMockHandler({ id: 'c1', display_name: 'Acme s.r.o.', client_type: 'company' }),
      getGetClientsClientIdContactPersonsMockHandler([]),
      getDeleteClientsIdMockHandler(),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { router } = renderApp('/clients/c1')
    const user = userEvent.setup()

    expect(await screen.findByRole('heading', { name: 'Acme s.r.o.' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/clients'))
  })

  it('removes a contact person after confirming', async () => {
    server.use(
      getGetClientsIdMockHandler({ id: 'c1', display_name: 'Acme s.r.o.', client_type: 'company' }),
      getGetClientsClientIdContactPersonsMockHandler([
        { id: 'p1', full_name: 'John Doe', is_primary: false },
      ]),
      getDeleteClientsClientIdContactPersonsIdMockHandler(),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderApp('/clients/c1')
    const user = userEvent.setup()

    expect(await screen.findByText('John Doe')).toBeInTheDocument()
    // Two "Delete" buttons exist: the client-level one (page header) and this row's.
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[deleteButtons.length - 1])

    expect(window.confirm).toHaveBeenCalled()
  })
})
