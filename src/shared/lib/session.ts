import { queryClient } from '@/shared/lib/query-client'

/**
 * Ends a signed-in session locally.
 *
 * Clearing the store is not enough on its own. `main.tsx` renders the whole
 * app against the `queryClient` singleton, its keys are request URLs with no
 * account in them, and signing out is a client-side navigation that keeps the
 * tab — and the cache — alive. Without this, the next person to sign in on
 * that tab is served the previous account's clients, invoices and profile
 * straight from cache, and `staleTime` means it is not even a flash: nothing
 * refetches for 30 seconds.
 *
 * The 401 path in `api/mutator.ts` needs no call here, and neither does
 * account deletion — both leave through a full page load, which takes the
 * cache with it.
 */
export function endSession(clearStore: () => void): void {
  clearStore()
  queryClient.clear()
}
