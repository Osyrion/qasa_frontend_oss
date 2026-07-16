import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  getGetExpensesMockHandler,
  getPostExpensesMockHandler,
} from '@/api/generated/expenses/expenses.msw'
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

describe('expenses list', () => {
  it('renders expenses returned by the list endpoint', async () => {
    server.use(
      getGetExpensesMockHandler({
        data: [
          {
            id: 'e-1',
            description: 'Laptop stand',
            category: 'hardware',
            amount: 49.9,
            currency: 'EUR',
            date: '2026-07-01',
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )

    renderApp('/expenses')

    expect(await screen.findByText('Laptop stand')).toBeInTheDocument()
    expect(screen.getByText('Hardware')).toBeInTheDocument()
  })

  it('creates a new expense from the sheet', async () => {
    server.use(
      getGetExpensesMockHandler({
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      }),
    )
    let created = false
    server.use(
      getPostExpensesMockHandler(() => {
        created = true
        return {
          id: 'new-e-id',
          description: 'Conference ticket',
          category: 'education',
          amount: 100,
          currency: 'EUR',
          date: '2026-07-01',
        }
      }),
    )

    renderApp('/expenses')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'New expense' }))
    const dialog = await screen.findByRole('dialog')

    await user.type(screen.getByLabelText('Description'), 'Conference ticket')
    await user.type(screen.getByLabelText('Amount'), '100')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(created).toBe(true))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    void dialog
  })
})
