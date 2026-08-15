import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { useGetAuthMe } from '@/api/generated/authentication/authentication'
import { syncLocale } from '@/shared/i18n'
import { Spinner } from '@/shared/ui/spinner'

import { useAuthStore } from './store'

/**
 * Wraps authenticated routes: no token -> /login. With a token it refreshes
 * the user from GET auth/me (a stale/revoked token turns into a 401 there,
 * which the axios interceptor converts into /login?expired=1).
 */
export function RequireAuth() {
  const token = useAuthStore((state) => state.token)
  const setUser = useAuthStore((state) => state.setUser)
  const location = useLocation()

  const me = useGetAuthMe({ query: { enabled: Boolean(token) } })
  const user = me.data?.data

  useEffect(() => {
    if (user) {
      setUser(user)
      syncLocale(user.locale)
    }
  }, [user, setUser])

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

/**
 * Wraps routes gated by `residency.required` on the backend (invoicing,
 * quotes, orders, supplier-invoices, recurring, statistics, reports, …):
 * no tax residency set yet -> onboarding.
 */
export function RequireResidency() {
  const me = useGetAuthMe()
  const user = me.data?.data

  if (me.isPending) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    )
  }

  if (user && !user.has_tax_residency) {
    return <Navigate to="/onboarding/residency" replace />
  }

  return <Outlet />
}

/** Wraps guest-only routes (login, register, …): token -> /dashboard. */
export function GuestOnly() {
  const token = useAuthStore((state) => state.token)

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
