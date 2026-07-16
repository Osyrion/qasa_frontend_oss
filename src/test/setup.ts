import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

import { useAuthStore } from '@/features/auth/store'
import { server } from './server'

// jsdom has no ResizeObserver; radix-ui's Select (and other size-aware primitives) need one to mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub

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
