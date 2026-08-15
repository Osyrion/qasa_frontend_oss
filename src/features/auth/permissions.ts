import { useAuthStore } from './store'

/**
 * Whether the signed-in user holds a backend ability — the strings from
 * flok_backend's AbilityCatalog / PermissionCatalog (`invoices.manage`,
 * `taxation.manage`, `reports.view`, …), returned by GET auth/me.
 *
 * A UX affordance, never a security boundary. The API enforces every one of
 * these on every request and is the only thing that decides; this exists so
 * the UI stops offering actions the server will answer with a 403. Which it
 * now does in places it previously did not: expenses and exchange rates used
 * to be writable by any role, and the tax-return wizard by any role.
 *
 * `permissions` is missing only on a session persisted before the field was
 * used here, and RequireAuth refreshes the user from GET auth/me on every
 * authenticated route. Missing therefore means "not known yet", not "none" —
 * allowing it keeps an owner's buttons from flickering away on a cold load,
 * and the worst case is exactly the 403 they would have hit anyway.
 */
export function useCan(ability: string): boolean {
  const permissions = useAuthStore((state) => state.user?.permissions)

  return permissions === undefined || permissions.includes(ability)
}
