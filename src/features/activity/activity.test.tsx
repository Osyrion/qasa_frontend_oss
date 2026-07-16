import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { getGetActivityMockHandler } from '@/api/generated/activity/activity.msw'
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

describe('activity log', () => {
  it('humanizes a known event and shows "System" for a null actor', async () => {
    server.use(
      getGetActivityMockHandler({
        data: [
          {
            id: 'a-1',
            actor_id: null,
            subject_type: 'invoice',
            subject_id: 'inv-1',
            event: 'invoice.status_changed',
            changes: { from: 'draft', to: 'sent' },
            created_at: '2026-07-16T10:00:00Z',
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )

    renderApp('/activity')

    expect(await screen.findByText('Invoice status changed')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('falls back to the raw event string when there is no humanized label', async () => {
    server.use(
      getGetActivityMockHandler({
        data: [
          {
            id: 'a-1',
            actor_id: 'u-1',
            subject_type: 'widget',
            subject_id: 'w-1',
            event: 'widget.frobnicated',
            changes: null,
            created_at: '2026-07-16T10:00:00Z',
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )

    renderApp('/activity')

    expect(await screen.findByText('widget.frobnicated')).toBeInTheDocument()
  })

  it('expands the before/after diff for a status change', async () => {
    server.use(
      getGetActivityMockHandler({
        data: [
          {
            id: 'a-1',
            actor_id: null,
            subject_type: 'invoice',
            subject_id: 'inv-1',
            event: 'invoice.status_changed',
            changes: { from: 'draft', to: 'sent' },
            created_at: '2026-07-16T10:00:00Z',
          },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      }),
    )

    renderApp('/activity')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Show changes' }))

    expect(await screen.findByText('draft')).toBeInTheDocument()
    expect(screen.getByText('sent')).toBeInTheDocument()
  })

  it('shows a friendly forbidden state on a 403', async () => {
    server.use(
      http.get('*/api/v1/activity', () =>
        HttpResponse.json({ message: 'Forbidden.' }, { status: 403 }),
      ),
    )

    renderApp('/activity')

    expect(await screen.findByText('Activity log unavailable')).toBeInTheDocument()
  })
})
