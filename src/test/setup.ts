import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'

import { useAuthStore } from '@/features/auth/store'
import { queryClient } from '@/shared/lib/query-client'
import { server } from './server'

// findBy*/waitFor default to 1s, which is not enough for a page that mounts,
// resolves several queries (including RequireResidency's own auth/me check)
// and paints while other test files compete for the CPU. Still far below
// testTimeout, so a genuine hang fails on its own merits.
configure({ asyncUtilTimeout: 5000 })

// jsdom has no ResizeObserver; radix-ui's Select (and other size-aware primitives) need one to mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub

// jsdom has no pointer-capture APIs or scrollIntoView; radix-ui's Select needs them to open/select via pointer events.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

// jsdom's Blob has no stream(), and undici's body extraction — reached when
// MSW's XHR interceptor builds a Response for a request the app made with
// responseType: 'blob' — calls it. Every file-download test (exports, PDFs,
// attachments) therefore ended in an unhandled "object.stream is not a
// function" rejection. The tests themselves passed, but vitest exits
// non-zero on an unhandled error, so `npm run test` was red behind a green
// summary — and only visibly so when its exit code was not swallowed by a
// pipe.
Blob.prototype.stream ??= function stream(this: Blob) {
  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      this.arrayBuffer()
        .then((buffer) => {
          controller.enqueue(new Uint8Array(buffer))
          controller.close()
        })
        .catch((error: unknown) => controller.error(error))
    },
  })
} as Blob['stream']

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  useAuthStore.getState().clear()
  // Components invalidate through the `queryClient` singleton even though
  // renderApp() mounts a fresh client, so anything they cached there outlives
  // the test that put it in.
  queryClient.clear()
})

afterAll(() => {
  server.close()
})
