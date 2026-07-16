import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  getGetExpensesMockHandler,
  getGetExpensesExpenseMockHandler,
} from '@/api/generated/expenses/expenses.msw'
import { getPostExpensesExpenseAttachmentMockHandler } from '@/api/generated/expense-attachments/expense-attachments.msw'
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
    getGetExpensesMockHandler({
      data: [
        {
          id: 'e-1',
          description: 'Laptop stand',
          category: 'hardware',
          amount: 49.9,
          currency: 'EUR',
          date: '2026-07-01',
          attachment: { filename: 'receipt.pdf', mime_type: 'application/pdf', size_bytes: 1200 },
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
    }),
    getGetExpensesExpenseMockHandler({
      id: 'e-1',
      description: 'Laptop stand',
      category: 'hardware',
      amount: 49.9,
      currency: 'EUR',
      date: '2026-07-01',
      attachment: { filename: 'receipt.pdf', mime_type: 'application/pdf', size_bytes: 1200 },
    }),
  )
})

describe('expense attachment', () => {
  it('shows the existing attachment and confirms before replacing it', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    let uploadRequested = false
    server.use(
      getPostExpensesExpenseAttachmentMockHandler(() => {
        uploadRequested = true
        return {
          id: 'e-1',
          description: 'Laptop stand',
          category: 'hardware',
          amount: 49.9,
          currency: 'EUR',
          date: '2026-07-01',
          attachment: {
            filename: 'new-receipt.pdf',
            mime_type: 'application/pdf',
            size_bytes: 900,
          },
        }
      }),
    )

    renderApp('/expenses')
    const user = userEvent.setup()

    await user.click(await screen.findByText('Laptop stand'))
    await screen.findByRole('dialog')
    expect(screen.getByText('receipt.pdf')).toBeInTheDocument()

    const file = new File(['%PDF'], 'new-receipt.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => expect(uploadRequested).toBe(true))
    confirmSpy.mockRestore()
  })
})
