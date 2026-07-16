import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

import { useAuthStore } from '@/features/auth/store'
import { server } from './server'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  useAuthStore.getState().clear()
})

afterAll(() => {
  server.close()
})
