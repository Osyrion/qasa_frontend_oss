import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'

import { getGetAuthMeMockHandler } from '@/api/generated/authentication/authentication.msw'
import { getGetClientsMockHandler } from '@/api/generated/clients/clients.msw'
import type { User } from '@/api/generated/qASAAPIDocumentation.schemas'
import { routes } from '@/app/router'
import { useAuthStore } from '@/features/auth/store'
import { queryClient } from '@/shared/lib/query-client'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { server } from '@/test/server'

const userA: User = {
  id: '1',
  name: 'A',
  full_name: 'Owner A',
  email: 'a@qasa.local',
  locale: 'en',
}
const userB: User = {
  id: '2',
  name: 'B',
  full_name: 'Owner B',
  email: 'b@qasa.local',
  locale: 'en',
}

const clientsOf = (displayName: string) =>
  getGetClientsMockHandler({
    data: [
      {
        id: 'c1',
        display_name: displayName,
        client_type: 'company',
        is_customer: true,
        is_vendor: false,
        created_at: '2026-01-05T10:00:00Z',
      },
    ],
    meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
  })

/**
 * Deliberately not `renderApp()`: that helper hands every render a fresh
 * QueryClient, and the whole point here is the singleton `main.tsx` actually
 * mounts the app against — the one that survives a client-side sign-out.
 */
function renderWithSharedClient(initialEntry: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] })

  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

/**
 * Signing out is a client-side navigation: the tab, and with it the cache,
 * survives it. Query keys are request URLs with no account in them, so
 * without an explicit wipe the next person to sign in on this machine is
 * served the previous account's rows — and `staleTime` means nothing
 * refetches to correct it.
 */
describe('session cache', () => {
  it("does not serve the previous account's data to the next sign-in in the same tab", async () => {
    const user = userEvent.setup()

    // RequireAuth refreshes the user from auth/me, so the nav shows whatever
    // that returns — pin it, the sign-out menu is reached through it.
    server.use(getGetAuthMeMockHandler({ data: { ...userA, has_tax_residency: true } }))
    server.use(clientsOf('ACCOUNT-A s.r.o.'))
    useAuthStore.getState().setSession('tok-a', userA)

    const first = renderWithSharedClient('/clients')
    expect(await screen.findByText('ACCOUNT-A s.r.o.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Owner A' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))
    await waitFor(() => expect(useAuthStore.getState().token).toBeNull())
    first.unmount()

    // Somebody else signs in on the same machine, same tab.
    server.use(getGetAuthMeMockHandler({ data: { ...userB, has_tax_residency: true } }))
    server.use(clientsOf('ACCOUNT-B s.r.o.'))
    useAuthStore.getState().setSession('tok-b', userB)
    renderWithSharedClient('/clients')

    expect(await screen.findByText('ACCOUNT-B s.r.o.')).toBeInTheDocument()
    expect(screen.queryByText('ACCOUNT-A s.r.o.')).not.toBeInTheDocument()
  })
})
