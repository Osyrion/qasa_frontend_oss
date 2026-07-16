import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuthStore } from './store'

/** Wraps authenticated routes: no token -> /login (with return location). */
export function RequireAuth() {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()

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
