import { useCallback, useRef } from 'react'

/**
 * Idempotency-Key for create-like POSTs (required by e.g. POST /invoices).
 * The key is created lazily and reused across retries of the same logical
 * submission; call `reset()` after success so the next submission gets a
 * fresh key.
 */
export function useIdempotencyKey(): { get: () => string; reset: () => void } {
  const keyRef = useRef<string | null>(null)

  const get = useCallback(() => {
    keyRef.current ??= crypto.randomUUID()
    return keyRef.current
  }, [])

  const reset = useCallback(() => {
    keyRef.current = null
  }, [])

  return { get, reset }
}
