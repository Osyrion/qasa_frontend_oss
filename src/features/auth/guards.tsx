import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { useGetAuthMe } from '@/api/generated/authentication/authentication'
import { syncLocale } from '@/shared/i18n'

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

  useEffect(() => {
    if (me.data) {
      setUser(me.data)
      syncLocale(me.data.locale)
    }
  }, [me.data, setUser])

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
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
