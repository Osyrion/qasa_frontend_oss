import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'

import { routes } from '@/app/router'
import { createQueryClient } from '@/shared/lib/query-client'
import { TooltipProvider } from '@/shared/ui/tooltip'

/** Renders the real route tree at the given URL with a fresh query client. */
export function renderApp(initialEntry: string) {
  const queryClient = createQueryClient()
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] })

  const result = render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  )

  return { ...result, router }
}
