import { renderHook } from '@testing-library/react'

import { useIdempotencyKey } from './idempotency'

describe('useIdempotencyKey', () => {
  it('reuses the same key until reset, then issues a fresh one', () => {
    const { result } = renderHook(() => useIdempotencyKey())

    const first = result.current.get()
    expect(result.current.get()).toBe(first)

    result.current.reset()
    const second = result.current.get()

    expect(second).not.toBe(first)
    expect(second).toMatch(/^[0-9a-f-]{36}$/)
  })
})
